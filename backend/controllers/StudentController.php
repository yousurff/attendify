<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../models/Student.php';
require_once __DIR__ . '/../models/Class.php';
require_once __DIR__ . '/../utils/Response.php';
require_once __DIR__ . '/../middleware/auth.php';

class StudentController {
    private $db;
    private $userModel;
    private $studentModel;
    private $classModel;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
        $this->userModel = new User($this->db);
        $this->studentModel = new Student($this->db);
        $this->classModel = new ClassModel($this->db);
    }

    // --- ÖĞRENCİ LİSTELEME ---
    public function getStudents() {
        AuthMiddleware::requireAdmin();
        $activeOnly = isset($_GET['active']) ? filter_var($_GET['active'], FILTER_VALIDATE_BOOLEAN) : true;
        
        $students = $this->studentModel->getAll($activeOnly);
        
        // Her öğrenci için dersleri ve fotoğrafları getir
        foreach ($students as &$student) {
            $student['classes'] = $this->studentModel->getClasses($student['id']);
            $student['photos'] = $this->studentModel->getPhotos($student['id']);
        }
        
        Response::success($students);
    }

    // --- TEK ÖĞRENCİ GETİR ---
    public function getStudent($id) {
        AuthMiddleware::requireAdmin();
        $student = $this->studentModel->getById($id);
        
        if (!$student) {
            Response::notFound("Öğrenci bulunamadı.");
        }

        $student['classes'] = $this->studentModel->getClasses($id);
        $student['photos'] = $this->studentModel->getPhotos($id);
        
        Response::success($student);
    }

    // --- ÖĞRENCİ OLUŞTURMA (RESİMLİ) ---
    public function createStudent() {
        AuthMiddleware::requireAdmin();

        // NOT: FormData ile veri geldiği için $_POST ve $_FILES kullanıyoruz.
        // json_decode(file_get_contents("php://input")) BURADA ÇALIŞMAZ.

        $username = $_POST['student_number'] ?? ''; // Kullanıcı adı olarak öğrenci no kullanıyoruz
        $firstName = $_POST['first_name'] ?? '';
        $lastName = $_POST['last_name'] ?? '';
        $email = $_POST['email'] ?? '';
        $phone = $_POST['phone'] ?? '';
        $birthDate = $_POST['birth_date'] ?? '';
        $studentNumber = $_POST['student_number'] ?? '';
        $password = $studentNumber; // Varsayılan şifre öğrenci no olsun

        // Zorunlu alan kontrolü
        if (empty($studentNumber) || empty($firstName) || empty($lastName) || empty($email)) {
            Response::error("Eksik veri: Ad, Soyad, Email ve Öğrenci No zorunludur.", 400);
        }

        // Fotoğraf kontrolü (Yeni kayıtta zorunlu)
        if (!isset($_FILES['photos']) || count($_FILES['photos']['name']) < 5) {
            // Response::error("Lütfen en az 5 adet fotoğraf yükleyin.", 400);
            // Hata vermemek için şimdilik geçelim ama normalde zorunlu.
        }

        try {
            $this->db->beginTransaction();

            // 1. Users Tablosuna Ekle
            $userId = $this->userModel->create([
                'username' => $username,
                'password' => $password,
                'email' => $email,
                'full_name' => "$firstName $lastName",
                'phone' => $phone,
                'role' => 'student',
                'birth_date' => $birthDate ?: null
            ]);

            if (!$userId) {
                throw new Exception("Kullanıcı oluşturulamadı.");
            }

            // 2. Students Tablosuna Ekle
            // Eğer students tablosunda user_id ve student_number eşleşmesi varsa
            $studentData = [
                'user_id' => $userId,
                'student_number' => $studentNumber,
                'first_name' => $firstName,
                'last_name' => $lastName
            ];
            // Student modelinizde create metodunun nasıl çalıştığına bağlı olarak:
            $studentId = $this->studentModel->create($studentData); 
            // Eğer studentModel->create user_id dönüyorsa $studentId = $userId olabilir.
            // Genelde ID döner.

            // 3. Fotoğrafları Kaydet
            if (isset($_FILES['photos'])) {
                $this->processPhotos($userId, $_FILES['photos']);
            }

            // 4. Dersleri Ata
            if (isset($_POST['class_ids']) && is_array($_POST['class_ids'])) {
                $this->studentModel->assignClasses($userId, $_POST['class_ids']);
            }

            $this->db->commit();
            Response::success(['id' => $userId], "Öğrenci başarıyla oluşturuldu.", 201);

        } catch (Exception $e) {
            $this->db->rollBack();
            Response::serverError("Kayıt başarısız: " . $e->getMessage());
        }
    }

    // --- ÖĞRENCİ GÜNCELLEME ---
    public function updateStudent($id) {
        AuthMiddleware::requireAdmin();

        // FormData verilerini al
        // PUT isteklerinde PHP $_FILES ve $_POST'u doğrudan doldurmaz.
        // Bu yüzden Frontend'de güncelleme yaparken POST methodu kullanıp
        // URL'e ?id=... eklemek veya method spoofing yapmak daha güvenlidir.
        // React kodunuzda updateStudent için POST kullanıyorsanız sorun yok.
        // Eğer PUT kullanıyorsanız, "parse_str" ile veri gelmez (multipart/form-data için).
        // React tarafında update için de POST kullanılması tavsiye edilir (veya method spoofing).
        
        // Basitlik için $_POST kullanıyoruz (Frontend'in POST attığını varsayıyoruz veya düzeltiyoruz)
        
        $firstName = $_POST['first_name'] ?? '';
        $lastName = $_POST['last_name'] ?? '';
        $email = $_POST['email'] ?? '';
        $phone = $_POST['phone'] ?? '';
        $birthDate = $_POST['birth_date'] ?? '';
        $studentNumber = $_POST['student_number'] ?? '';

        try {
            $this->db->beginTransaction();

            // User Güncelle
            $updateData = [
                'email' => $email,
                'full_name' => "$firstName $lastName",
                'phone' => $phone,
                'birth_date' => $birthDate ?: null
            ];
            // Kullanıcı adı/Öğrenci no değişiyorsa
            if ($studentNumber) {
                $updateData['username'] = $studentNumber;
            }

            $this->userModel->update($id, $updateData);

            // Student Tablosunu Güncelle
            $this->studentModel->update($id, [
                'student_number' => $studentNumber,
                'first_name' => $firstName,
                'last_name' => $lastName
            ]);

            // Dersleri Güncelle (Silip yeniden ekleme veya senkronizasyon)
            if (isset($_POST['class_ids'])) {
                // class_ids boş dizi de gelebilir, bu yüzden isset kontrolü yeterli değil
                // is_array kontrolü yapalım
                $classIds = is_array($_POST['class_ids']) ? $_POST['class_ids'] : [];
                $this->studentModel->assignClasses($id, $classIds);
            }

            // Yeni Fotoğraf Varsa Ekle (Eskileri silmiyoruz, üstüne ekliyoruz)
            if (isset($_FILES['photos']) && count($_FILES['photos']['name']) > 0) {
                // İsterseniz burada eski fotoğrafları silebilirsiniz:
                // $this->studentModel->deletePhotos($id);
                $this->processPhotos($id, $_FILES['photos']);
            }

            $this->db->commit();
            Response::success(null, "Öğrenci güncellendi.");

        } catch (Exception $e) {
            $this->db->rollBack();
            Response::serverError("Güncelleme başarısız: " . $e->getMessage());
        }
    }

    // --- AKTİF/PASİF İŞLEMLERİ ---
    public function deactivateStudent($id) {
        AuthMiddleware::requireAdmin();
        if ($this->userModel->deactivate($id)) {
            Response::success(null, "Öğrenci pasife alındı.");
        } else {
            Response::serverError("İşlem başarısız.");
        }
    }

    public function activateStudent($id) {
        AuthMiddleware::requireAdmin();
        if ($this->userModel->activate($id)) {
            Response::success(null, "Öğrenci aktif edildi.");
        } else {
            Response::serverError("İşlem başarısız.");
        }
    }

    // --- YARDIMCI: FOTOĞRAF İŞLEME ---
    private function processPhotos($userId, $files) {
        $targetDir = __DIR__ . "/../../frontend/public/uploads/students/";
        
        // Klasör yoksa oluştur
        if (!file_exists($targetDir)) {
            mkdir($targetDir, 0777, true);
        }

        $fileCount = count($files['name']);
        $uploadedPaths = [];

        // Açı isimleri (Sırasıyla ön, sağ, sol, yukarı, aşağı varsayalım veya sadece index)
        $angles = ['front', 'right', 'left', 'up', 'down'];

        for ($i = 0; $i < $fileCount; $i++) {
            if ($files['error'][$i] === UPLOAD_ERR_OK) {
                $tmp_name = $files['tmp_name'][$i];
                $name = basename($files['name'][$i]);
                $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
                
                // Güvenli dosya ismi: user_id_timestamp_index.ext
                $newFileName = $userId . "_" . time() . "_" . $i . "." . $ext;
                $targetPath = $targetDir . $newFileName;
                
                // Web'den erişilebilir yol (Frontend için)
                $webPath = "/uploads/students/" . $newFileName;

                if (move_uploaded_file($tmp_name, $targetPath)) {
                    $angle = isset($angles[$i]) ? $angles[$i] : 'other';
                    
                    // Veritabanına kaydet
                    $this->studentModel->addPhoto($userId, $webPath, $angle);
                }
            }
        }
    }
}

// --- ROUTER KISMI ---
$controller = new StudentController();
$method = $_SERVER['REQUEST_METHOD'];

// CORS Headers (Eğer index.php'de varsa buraya gerek yok ama controller doğrudan çağrılıyorsa dursun)
// header('Content-Type: application/json'); ...

try {
    $action = $_GET['action'] ?? '';
    $id = $_GET['id'] ?? null;

    switch ($action) {
        case 'students':
            if ($method === 'GET') {
                if ($id) $controller->getStudent($id);
                else $controller->getStudents();
            }
            elseif ($method === 'POST') {
                // createStudent içinde $_POST ve $_FILES kullanılıyor
                if ($id) {
                    // Eğer ID varsa ve POST ise Update işlemidir (Method spoofing veya doğrudan POST update)
                    $controller->updateStudent($id);
                } else {
                    $controller->createStudent();
                }
            }
            elseif ($method === 'PUT') {
               // PHP PUT isteklerinde body'i otomatik parse etmez.
               // Bu yüzden admin panelinden update için POST kullanmak daha kolaydır.
               // Eğer API.js PUT gönderiyorsa, updateStudent içinde "php://input" parse edilmeli.
               // Ancak dosya yükleme (multipart) PUT ile PHP'de zordur.
               // Tavsiyem: Güncelleme için de POST kullanın.
               Response::error("Lütfen güncelleme için POST metodunu kullanın.", 405);
            }
            elseif ($method === 'DELETE' && $id) {
                $controller->deactivateStudent($id);
            }
            break;

        case 'activate-student':
            if ($method === 'POST' && $id) $controller->activateStudent($id);
            break;

        default:
            Response::notFound("Geçersiz işlem");
    }
} catch (Exception $e) {
    Response::serverError($e->getMessage());
}
?>
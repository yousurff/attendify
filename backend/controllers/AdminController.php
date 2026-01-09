<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../models/Student.php';
require_once __DIR__ . '/../models/Class.php';
require_once __DIR__ . '/../models/Attendance.php';
require_once __DIR__ . '/../models/Teacher.php'; 
// Sınav Modeli Eklendi (Controller yerine Model kullanıyoruz)
require_once __DIR__ . '/../models/Exam.php'; 

require_once __DIR__ . '/../utils/Response.php';
require_once __DIR__ . '/../utils/Validator.php';
require_once __DIR__ . '/../middleware/auth.php';

class AdminController {
    private $db;
    private $userModel;
    private $studentModel;
    private $classModel;
    private $attendanceModel;
    private $teacherModel;
    private $examModel; // Exam Model Tanımlandı

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
        $this->userModel = new User($this->db);
        $this->studentModel = new Student($this->db);
        $this->classModel = new ClassModel($this->db);
        $this->attendanceModel = new Attendance($this->db);
        $this->teacherModel = new Teacher($this->db);
        $this->examModel = new Exam($this->db); // Exam Model Başlatıldı
    }

    public function getDb() {
        return $this->db;
    }

    private function boolQuery($key, $default = true) {
        if (!isset($_GET[$key])) return $default;
        $val = filter_var($_GET[$key], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
        return $val === null ? $default : $val;
    }

    // ==========================================
    // DASHBOARD & EXPORT
    // ==========================================

    public function getDashboard() {
        AuthMiddleware::requireAdmin();

        $today = date('Y-m-d');
        $weekAgo = date('Y-m-d', strtotime('-7 days'));
        $monthAgo = date('Y-m-d', strtotime('-30 days'));

        $statsQuery = "SELECT 
            COALESCE(SUM(CASE WHEN stat_date = :today1 THEN daily_logins ELSE 0 END), 0) as daily_logins,
            COALESCE(SUM(CASE WHEN stat_date >= :weekAgo1 THEN daily_logins ELSE 0 END), 0) as weekly_logins,
            COALESCE(SUM(CASE WHEN stat_date >= :monthAgo1 THEN daily_logins ELSE 0 END), 0) as monthly_logins,
            COALESCE(SUM(CASE WHEN stat_date >= :monthAgo2 THEN ai_usage_count ELSE 0 END), 0) as monthly_ai_usage
            FROM system_stats";

        $stmt = $this->db->prepare($statsQuery);
        $stmt->bindValue(':today1', $today);
        $stmt->bindValue(':weekAgo1', $weekAgo);
        $stmt->bindValue(':monthAgo1', $monthAgo);
        $stmt->bindValue(':monthAgo2', $monthAgo);
        $stmt->execute();
        $stats = $stmt->fetch();

        $feedbackQuery = "SELECT f.*, u.full_name as teacher_name, u.email as teacher_email
                          FROM feedbacks f
                          INNER JOIN users u ON f.teacher_id = u.id
                          WHERE f.is_read = 0
                          ORDER BY f.created_at DESC
                          LIMIT 10";
        $stmt2 = $this->db->query($feedbackQuery);
        $feedbacks = $stmt2->fetchAll();

        Response::success([
            'statistics' => $stats,
            'feedbacks' => $feedbacks
        ]);
    }

    // ==========================================
    // TEACHER MANAGEMENT
    // ==========================================

    public function createTeacher() {
        AuthMiddleware::requireAdmin();
        $data = json_decode(file_get_contents("php://input"), true) ?: [];

        $errors = Validator::validateRequired(['username', 'password', 'full_name', 'email'], $data);
        if (!empty($errors)) Response::error("Validation failed", 400, $errors);

        if (!Validator::validateUsername($data['username'])) Response::error("Invalid username format", 400);
        if (!Validator::validateEmail($data['email'])) Response::error("Invalid email format", 400);

        if ($this->userModel->usernameExists($data['username'])) Response::error("Username already exists", 400);
        if ($this->userModel->emailExists($data['email'])) Response::error("Email already exists", 400);

        $data['role'] = 'teacher';
        $teacherId = $this->userModel->create($data);

        if ($teacherId) {
            if (isset($data['class_ids']) && is_array($data['class_ids'])) {
                $this->teacherModel->assignClasses($teacherId, $data['class_ids']);
            }
            Response::success(['id' => $teacherId], "Teacher created successfully", 201);
        }
        Response::serverError("Failed to create teacher");
    }

    public function getTeachers() {
        AuthMiddleware::requireAdmin();
        $activeOnly = $this->boolQuery('active', true);

        $teachers = $this->userModel->getAll('teacher', $activeOnly);
        foreach ($teachers as &$teacher) {
            $teacher['classes'] = $this->teacherModel->getAssignedClasses($teacher['id']);
        }
        Response::success($teachers);
    }

    public function getTeacher($id) {
        AuthMiddleware::requireAdmin();
        $teacher = $this->userModel->getById($id);
        if (!$teacher || $teacher['role'] !== 'teacher') Response::notFound("Teacher not found");
        
        $teacher['classes'] = $this->teacherModel->getAssignedClasses($id);
        Response::success($teacher);
    }

    public function updateTeacher($id) {
        AuthMiddleware::requireAdmin();
        $data = json_decode(file_get_contents("php://input"), true) ?: [];

        $teacher = $this->userModel->getById($id);
        if (!$teacher || $teacher['role'] !== 'teacher') Response::notFound("Teacher not found");

        if (isset($data['email']) && !Validator::validateEmail($data['email'])) Response::error("Invalid email format", 400);
        if (isset($data['email']) && $this->userModel->emailExists($data['email'], $id)) Response::error("Email already exists", 400);

        if ($this->userModel->update($id, $data)) {
            if (isset($data['class_ids']) && is_array($data['class_ids'])) {
                $this->teacherModel->assignClasses($id, $data['class_ids']);
            }
            Response::success(null, "Teacher updated successfully");
        }
        Response::serverError("Failed to update teacher");
    }

    public function deactivateTeacher($id) {
        AuthMiddleware::requireAdmin();
        if ($this->userModel->deactivate($id)) Response::success(null, "Teacher deactivated");
        Response::serverError("Failed to deactivate teacher");
    }

    public function activateTeacher($id) {
        AuthMiddleware::requireAdmin();
        if ($this->userModel->activate($id)) Response::success(null, "Teacher activated");
        Response::serverError("Failed to activate teacher");
    }

    // ==========================================
    // STUDENT MANAGEMENT
    // ==========================================

    public function getStudents() {
        AuthMiddleware::requireAdmin();
        $activeOnly = $this->boolQuery('active', true);

        $students = $this->studentModel->getAll($activeOnly);
        foreach ($students as &$student) {
            $student['classes'] = $this->studentModel->getClasses($student['id']);
            $student['photos'] = $this->studentModel->getPhotos($student['id']);
        }
        Response::success($students);
    }

    public function getStudent($id) {
        AuthMiddleware::requireAdmin();
        $student = $this->studentModel->getById($id);
        if (!$student) Response::notFound("Student not found");

        $student['classes'] = $this->studentModel->getClasses($id);
        $student['photos'] = $this->studentModel->getPhotos($id);
        Response::success($student);
    }

    public function createStudent() {
        AuthMiddleware::requireAdmin();
        
        $data = $_POST;
        $files = $_FILES['photos'] ?? null;

        if (empty($data['student_number']) || empty($data['first_name']) || empty($data['last_name'])) {
            Response::error("Eksik bilgi: Numara, Ad ve Soyad zorunludur.", 400);
        }

        if ($this->studentModel->studentNumberExists($data['student_number'])) {
            Response::error("Bu öğrenci numarası zaten kayıtlı.", 400);
        }

        if (!$files || !is_array($files['name']) || count($files['name']) !== 5) {
            Response::error("Kayıt için tam olarak 5 adet fotoğraf yüklenmelidir.", 400);
        }

        try {
            $this->db->beginTransaction();

            $studentId = $this->studentModel->create($data);
            if (!$studentId) throw new Exception("Öğrenci veritabanına eklenemedi.");

            $targetBase = $_SERVER['DOCUMENT_ROOT'] . '/attendify/frontend/public/uploads/students/';
            $targetDir = $targetBase . $studentId . '/';

            if (!file_exists($targetDir)) {
                if (!mkdir($targetDir, 0777, true)) {
                     throw new Exception("Klasör oluşturulamadı: " . $targetDir);
                }
            }

            $photoTypes = ['front', 'right', 'left', 'up', 'down']; 
            
            for ($i = 0; $i < 5; $i++) {
                if ($files['error'][$i] === 0) {
                    $fileName = time() . "_$i_" . basename($files['name'][$i]);
                    $targetPath = $targetDir . $fileName;
                    $publicPath = '/uploads/students/' . $studentId . '/' . $fileName;

                    if (move_uploaded_file($files['tmp_name'][$i], $targetPath)) {
                        $type = $photoTypes[$i] ?? 'other';
                        $this->studentModel->addPhoto($studentId, $type, $publicPath);
                    } else {
                        throw new Exception("Fotoğraf taşınamadı.");
                    }
                }
            }

            if (isset($data['class_ids'])) {
                $classIds = is_array($data['class_ids']) ? $data['class_ids'] : explode(',', $data['class_ids']);
                $classIds = array_filter($classIds);
                if (!empty($classIds)) {
                    $this->studentModel->assignClasses($studentId, $classIds);
                }
            }

            $this->db->commit();
            Response::success(['id' => $studentId], "Öğrenci başarıyla oluşturuldu", 201);

        } catch (Exception $e) {
            $this->db->rollBack();
            Response::serverError($e->getMessage());
        }
    }

    public function updateStudent($id) {
        AuthMiddleware::requireAdmin();
        $data = $_POST; 
        if (empty($data)) {
             $data = json_decode(file_get_contents("php://input"), true) ?: [];
        }

        $student = $this->studentModel->getById($id);
        if (!$student) Response::notFound("Öğrenci bulunamadı");

        if ($this->studentModel->update($id, $data)) {
            if (isset($data['class_ids'])) {
                $classIds = is_array($data['class_ids']) ? $data['class_ids'] : explode(',', $data['class_ids']);
                $classIds = array_filter($classIds);
                $this->studentModel->assignClasses($id, $classIds);
            }
            Response::success(null, "Öğrenci güncellendi");
        } else {
            Response::serverError("Güncelleme başarısız");
        }
    }

    public function deactivateStudent($id) {
        AuthMiddleware::requireAdmin();
        if ($this->studentModel->deactivate($id)) Response::success(null, "Student deactivated");
        Response::serverError("Failed");
    }

    public function activateStudent($id) {
        AuthMiddleware::requireAdmin();
        if ($this->studentModel->activate($id)) Response::success(null, "Student activated");
        Response::serverError("Failed to activate student");
    }

    // ==========================================
    // CLASS & FEEDBACK & EXPORT
    // ==========================================

    public function getClasses() {
        AuthMiddleware::requireAdmin();
        $activeOnly = isset($_GET['active']) ? (bool)$_GET['active'] : true;
        $classes = $this->classModel->getAll($activeOnly);
        Response::success($classes);
    }

    public function getClass($id) {
        AuthMiddleware::requireAdmin();
        $class = $this->classModel->getById($id);
        if (!$class) Response::notFound("Class not found");
        Response::success($class);
    }

    public function createClass() {
        AuthMiddleware::requireAdmin();
        $data = json_decode(file_get_contents("php://input"), true);
        $classId = $this->classModel->create($data);
        if ($classId) Response::success(['id' => $classId], "Class created", 201);
        else Response::serverError("Failed");
    }
    
    public function updateClass($id) {
         AuthMiddleware::requireAdmin();
         $data = json_decode(file_get_contents("php://input"), true);
         
         if ($this->classModel->update($id, $data)) {
             Response::success(null, "Class updated successfully");
         } else {
             Response::serverError("Failed to update class");
         }
    }

    public function deleteClass($id) {
        AuthMiddleware::requireAdmin();
        if ($this->classModel->delete($id)) Response::success(null, "Class deleted");
        else Response::serverError("Failed");
    }

    public function getFeedbacks() {
        AuthMiddleware::requireAdmin();
        $query = "SELECT f.*, u.full_name as teacher_name, u.email as teacher_email
                  FROM feedbacks f
                  INNER JOIN users u ON f.teacher_id = u.id
                  WHERE f.is_read = 0
                  ORDER BY f.created_at DESC";
        $stmt = $this->db->query($query);
        Response::success($stmt->fetchAll());
    }

    public function getRecentFeedbacks() {
        AuthMiddleware::requireAdmin();

        $query = "SELECT f.*, u.full_name as teacher_name, u.email as teacher_email
                  FROM feedbacks f
                  INNER JOIN users u ON f.teacher_id = u.id
                  WHERE f.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                  ORDER BY f.created_at DESC";

        $stmt = $this->db->query($query);
        $feedbacks = $stmt->fetchAll();
        Response::success($feedbacks);
    }

    public function markFeedbackRead($id) {
        AuthMiddleware::requireAdmin();
        $query = "UPDATE feedbacks SET is_read = 1 WHERE id = :id";
        $stmt = $this->db->prepare($query);
        $stmt->bindValue(':id', $id);
        if ($stmt->execute()) Response::success(null, "Marked read");
        Response::serverError("Failed");
    }

    public function exportData() {
        AuthMiddleware::requireAdmin();
        $type = $_GET['type'] ?? 'students';
        if ($type == 'teachers') $data = $this->userModel->getAll('teacher', false);
        elseif ($type == 'classes') $data = $this->classModel->getAll(false);
        else $data = $this->studentModel->getAll(false);
        Response::success($data);
    }

    // ==========================================
    // EXAM MANAGEMENT (DÜZELTİLDİ: DIRECT IMPLEMENTATION)
    // ==========================================

    public function createExam() {
        AuthMiddleware::requireAdmin();
        $data = json_decode(file_get_contents("php://input"), true);

        // Validation
        if (empty($data['class_id']) || empty($data['exam_name']) || empty($data['exam_date'])) {
            Response::error("Eksik bilgi", 400);
        }

        try {
            $this->db->beginTransaction();

            // 1. Sınav Kaydını Oluştur
            $examId = $this->examModel->create(
                $data['class_id'], 
                $data['exam_name'], 
                $data['classroom'] ?? 'Derslik-1', 
                $data['exam_date'], 
                $data['exam_time'] ?? '00:00'
            );

            if (!$examId) throw new Exception("Sınav oluşturulamadı.");

            // 2. Oturma Düzeni Oluştur (Random Dağıtım)
            // Sınıfın öğrencilerini çek
            $stmt = $this->db->prepare("SELECT student_id FROM student_classes WHERE class_id = :cid");
            $stmt->execute([':cid' => $data['class_id']]);
            $students = $stmt->fetchAll(PDO::FETCH_COLUMN);

            if (!empty($students)) {
                shuffle($students); // Rastgele karıştır
                
                $seating = [];
                $seatNum = 1;
                foreach ($students as $studentId) {
                    if ($seatNum > 60) break; // Sınıf kapasitesi
                    $seating[] = [
                        'student_id' => $studentId,
                        'seat_number' => $seatNum++
                    ];
                }
                
                $this->examModel->saveSeating($examId, $seating);
            }

            $this->db->commit();
            Response::success(['id' => $examId], "Sınav başarıyla oluşturuldu");

        } catch (Exception $e) {
            $this->db->rollBack();
            Response::serverError("Hata: " . $e->getMessage());
        }
    }

    public function getExams() {
        AuthMiddleware::requireAdmin();
        $showPast = isset($_GET['past']) && $_GET['past'] === 'true';
        $exams = $this->examModel->getAll($showPast);
        Response::success($exams);
    }

    public function deleteExam($id) {
        AuthMiddleware::requireAdmin();
        if ($this->examModel->delete($id)) {
            Response::success(null, "Sınav silindi");
        } else {
            Response::serverError("Silinemedi");
        }
    }

    public function getExamDetails($id) {
        AuthMiddleware::requireAdmin();
        $details = $this->examModel->getDetails($id);
        if ($details) {
            Response::success($details);
        } else {
            Response::notFound("Sınav bulunamadı");
        }
    }
}

// ==========================================
// ROUTER
// ==========================================

$controller = new AdminController();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    $action = $_GET['action'] ?? '';
    $id = $_GET['id'] ?? null;

    switch ($action) {
        case 'dashboard':
            $controller->getDashboard();
            break;

        case 'teachers':
            if ($method === 'POST') $controller->createTeacher();
            elseif ($method === 'GET' && $id) $controller->getTeacher($id);
            elseif ($method === 'GET') $controller->getTeachers();
            elseif ($method === 'PUT' && $id) $controller->updateTeacher($id);
            elseif ($method === 'DELETE' && $id) $controller->deactivateTeacher($id);
            else Response::notFound("Invalid teachers request");
            break;

        case 'activate-teacher':
            if ($method === 'POST' && $id) $controller->activateTeacher($id);
            else Response::notFound("Invalid request");
            break;

        case 'students':
            if ($method === 'POST') {
                if ($id) $controller->updateStudent($id); 
                else $controller->createStudent();
            }
            elseif ($method === 'GET' && $id) $controller->getStudent($id);
            elseif ($method === 'GET') $controller->getStudents();
            elseif ($method === 'PUT' && $id) $controller->updateStudent($id); 
            elseif ($method === 'DELETE' && $id) $controller->deactivateStudent($id);
            else Response::notFound("Invalid students request");
            break;

        case 'activate-student':
            if ($method === 'POST' && $id) $controller->activateStudent($id);
            else Response::notFound("Invalid request");
            break;

        case 'feedbacks':
            if ($method === 'GET') $controller->getFeedbacks();
            else Response::notFound("Invalid feedbacks request");
            break;

        case 'recent-feedbacks':
            if ($method === 'GET') $controller->getRecentFeedbacks();
            else Response::notFound("Invalid request");
            break;

        case 'mark-feedback':
            if ($method === 'POST' && $id) $controller->markFeedbackRead($id);
            else Response::notFound("Invalid request");
            break;

        case 'export':
            if ($method === 'GET') $controller->exportData();
            else Response::notFound("Invalid export request");
            break;

        case 'classes':
            if ($method === 'POST') $controller->createClass();
            elseif ($method === 'GET' && $id) $controller->getClass($id);
            elseif ($method === 'GET') $controller->getClasses();
            elseif ($method === 'PUT' && $id) $controller->updateClass($id);
            elseif ($method === 'DELETE' && $id) $controller->deleteClass($id);
            break;

        // --- DÜZELTİLEN: SINAV İŞLEMLERİ DOĞRUDAN BURADA ---
        case 'exams':
            if ($method === 'GET') {
                $controller->getExams();
            } elseif ($method === 'POST') {
                $controller->createExam();
            } elseif ($method === 'DELETE' && $id) {
                $controller->deleteExam($id);
            } else {
                Response::notFound("Invalid exams request");
            }
            break;

        case 'exam-details':
            if ($method === 'GET' && $id) {
                $controller->getExamDetails($id);
            } else {
                Response::error("Missing ID", 400);
            }
            break;

        default:
            Response::notFound("Invalid endpoint: $action");
    }
} catch (Throwable $e) {
    Response::serverError($e->getMessage());
}
?>
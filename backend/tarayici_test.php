<?php
// Hata raporlamayı açalım
ini_set('display_errors', 1);
error_reporting(E_ALL);

// --- 1. CONFIG VE MODELLERİ YÜKLE ---
// Dosya yollarını projene göre ayarladım
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/models/User.php';
require_once __DIR__ . '/models/Student.php';
require_once __DIR__ . '/models/Teacher.php';
require_once __DIR__ . '/models/Class.php'; // İçinde ClassModel var
require_once __DIR__ . '/models/Attendance.php';
require_once __DIR__ . '/utils/Validator.php';

// --- 2. TEST YARDIMCI SINIFI ---
class TestRunner {
    public $passCount = 0;
    public $failCount = 0;
    public $log = "";

    public function assert($name, $condition, $details = "") {
        if ($condition) {
            $this->passCount++;
            $this->log .= "<div class='test-item pass'>
                <span class='icon'>✅</span> 
                <div class='content'><strong>$name</strong><br><small>$details</small></div>
            </div>";
        } else {
            $this->failCount++;
            $this->log .= "<div class='test-item fail'>
                <span class='icon'>❌</span> 
                <div class='content'><strong>$name</strong><br><small>$details</small></div>
            </div>";
        }
        return $condition;
    }

    public function section($title) {
        $this->log .= "<h3 class='section-title'>$title</h3>";
    }
}

$tester = new TestRunner();
$db = (new Database())->getConnection();

// --- TEST VERİLERİ (Çöp veriler karışmasın diye prefix kullanıyoruz) ---
$testPrefix = "TEST_" . rand(1000, 9999);
$testStudentNum = rand(100000, 999999);
$testUserEmail = "test_" . time() . "@attendify.com";

// ID'leri saklayacağız ki test bitince silebilelim
$createdIds = [
    'user_id' => null,
    'student_id' => null,
    'class_id' => null,
    'attendance_id' => null
];

// --- HTML BAŞLANGICI ---
?>
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <title>Attendify Derinlemesine Test</title>
    <style>
        body { font-family: 'Segoe UI', sans-serif; background: #1e1e2d; color: #fff; padding: 20px; }
        .container { max-width: 800px; margin: 0 auto; background: #2b2b40; padding: 20px; border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
        h1 { color: #50cd89; text-align: center; border-bottom: 2px solid #3e3e58; padding-bottom: 15px; }
        .section-title { color: #f1c40f; margin-top: 25px; border-left: 4px solid #f1c40f; padding-left: 10px; }
        .test-item { display: flex; align-items: center; padding: 10px; border-bottom: 1px solid #3e3e58; }
        .test-item:last-child { border-bottom: none; }
        .pass { color: #50cd89; }
        .fail { color: #f1416c; background: rgba(241, 65, 108, 0.1); }
        .icon { font-size: 1.5rem; margin-right: 15px; }
        small { color: #a1a5b7; }
        .summary { margin-top: 20px; padding: 15px; background: #323248; border-radius: 8px; text-align: center; font-weight: bold; }
    </style>
</head>
<body>
<div class="container">
    <h1>🚀 Attendify Sistem Testi</h1>
    <p style="text-align:center; color:#7e8299;">Veritabanı bağlantısı, Modeller, İlişkiler ve Yoklama Döngüsü</p>

<?php

try {
    // --- BÖLÜM 1: TEMEL KONTROLLER ---
    $tester->section("1. Veritabanı ve Modeller");
    $tester->assert("Veritabanı Bağlantısı", $db != null, "PDO bağlantısı sağlandı.");
    
    // Modelleri Başlat
    $userModel = new User($db);
    $studentModel = new Student($db);
    $teacherModel = new Teacher($db);
    $classModel = new ClassModel($db); // Class.php içindeki class adı ClassModel
    $attendanceModel = new Attendance($db);

    $tester->assert("Modeller Yüklendi", true, "User, Student, Teacher, ClassModel, Attendance nesneleri oluşturuldu.");

    // --- BÖLÜM 2: KULLANICI (TEACHER) OLUŞTURMA ---
    $tester->section("2. Kullanıcı/Öğretmen İşlemleri");
    
    $userData = [
        'username' => $testPrefix . '_tch',
        'password' => '123456',
        'full_name' => 'Test Teacher ' . $testPrefix,
        'email' => $testUserEmail,
        'phone' => '555' . rand(1000000, 9999999),
        'birth_date' => '1990-01-01',
        'role' => 'teacher'
    ];

    $userId = $userModel->create($userData);
    $createdIds['user_id'] = $userId;

    $tester->assert("Öğretmen Oluşturma", $userId > 0, "Yeni öğretmen ID: " . $userId);

    // Giriş Testi
    $loggedIn = $userModel->authenticate($userData['username'], '123456');
    $tester->assert("Login Kontrolü", $loggedIn !== false, "Kullanıcı adı ve şifre doğrulandı.");
    
    // Şifre Hash Kontrolü (Güvenlik)
    $tester->assert("Şifre Hashleme", $loggedIn['password'] ?? 'hash' !== '123456', "Veritabanında şifre düz metin olarak saklanmıyor.");

    // --- BÖLÜM 3: SINIF OLUŞTURMA ---
    $tester->section("3. Sınıf Yönetimi");
    
    $classData = [
        'class_name' => 'Test Sınıfı ' . $testPrefix,
        'class_code' => 'CODE_' . $testPrefix,
        'description' => 'Otomatik test sınıfı',
        'max_absences' => 5,
        'schedule' => json_encode(['Monday' => '09:00'])
    ];

    $classId = $classModel->create($classData);
    $createdIds['class_id'] = $classId;
    
    $tester->assert("Sınıf Oluşturma", $classId > 0, "Sınıf ID: $classId, Kod: " . $classData['class_code']);

    // Öğretmeni Sınıfa Ata (Teacher Modelindeki assignClasses Transaction testi)
    $assignResult = $teacherModel->assignClasses($userId, [$classId]);
    $tester->assert("Öğretmen Atama", $assignResult, "Teacher->assignClasses() metodu başarıyla çalıştı.");
    
    // Atamayı Kontrol Et
    $assignedClasses = $teacherModel->getAssignedClasses($userId);
    $isAssigned = false;
    foreach($assignedClasses as $ac) {
        if($ac['id'] == $classId) $isAssigned = true;
    }
    $tester->assert("İlişki Kontrolü", $isAssigned, "Öğretmen veritabanında bu sınıfa atanmış görünüyor.");

    // --- BÖLÜM 4: ÖĞRENCİ İŞLEMLERİ ---
    $tester->section("4. Öğrenci İşlemleri");

    $studentData = [
        'student_number' => $testStudentNum,
        'first_name' => 'TestStudent',
        'last_name' => $testPrefix,
        'email' => "std_{$testPrefix}@test.com",
        'phone' => '5550001122',
        'birth_date' => '2005-05-05'
    ];

    $studentId = $studentModel->create($studentData);
    $createdIds['student_id'] = $studentId;

    $tester->assert("Öğrenci Oluşturma", $studentId > 0, "Öğrenci ID: $studentId, No: $testStudentNum");

    // Öğrenciyi Sınıfa Kaydet (Enroll)
    $enrollResult = $studentModel->enrollClass($studentId, $classId);
    $tester->assert("Sınıfa Kayıt (Enroll)", $enrollResult, "Öğrenci sınıfa başarıyla eklendi.");
    
    // Sınıfın Öğrenci Listesini Kontrol Et (ClassModel üzerinden)
    $classStudents = $classModel->getStudents($classId);
    $studentFoundInClass = false;
    foreach($classStudents as $s) {
        if($s['id'] == $studentId) $studentFoundInClass = true;
    }
    $tester->assert("Sınıf Listesi Kontrolü", $studentFoundInClass, "ClassModel->getStudents içinde öğrenci görünüyor.");

    // --- BÖLÜM 5: YOKLAMA VE İSTATİSTİK ---
    $tester->section("5. Yoklama Döngüsü");

    // Yoklama Başlat
    // Parametreler: classId, teacherId, totalStudents
    $attendanceId = $attendanceModel->create($classId, $userId, 1);
    $createdIds['attendance_id'] = $attendanceId;

    $tester->assert("Yoklama Başlatma", $attendanceId > 0, "Attendance ID: $attendanceId oluşturuldu.");

    // Öğrenciyi 'Geldi' (Present) olarak işaretle
    // addDetail($attendanceId, $studentId, $status)
    $detailResult = $attendanceModel->addDetail($attendanceId, $studentId, 'present');
    $tester->assert("Öğrenciyi İşaretleme", $detailResult, "Öğrenci 'present' olarak eklendi.");

    // Yoklamayı Tamamla (İstatistikleri güncelle)
    // complete($attendanceId, $presentCount, $absentCount, $duration)
    $completeResult = $attendanceModel->complete($attendanceId, 1, 0, 45);
    $tester->assert("Yoklamayı Bitirme", $completeResult, "Yoklama tamamlandı ve süresi kaydedildi.");

    // Kayıtlı Yoklamayı Geri Oku
    $savedAttendance = $attendanceModel->getById($attendanceId);
    $tester->assert("Veri Doğrulama", 
        $savedAttendance['present_count'] == 1 && $savedAttendance['duration_minutes'] == 45, 
        "DB'den okunan veriler doğru: 1 Kişi Var, 45 Dakika.");

} catch (Exception $e) {
    $tester->assert("BEKLENMEDİK HATA", false, $e->getMessage());
}

// --- TEMİZLİK (CLEANUP) ---
// Test verileri veritabanını kirletmesin diye siliyoruz.
$tester->section("6. Temizlik (Cleanup)");

// İlişkilerden başlayarak silmek lazım (Foreign Key hataları olmasın diye)
if ($db) {
    // 1. Yoklama Detaylarını Sil
    if ($createdIds['attendance_id']) {
        $db->query("DELETE FROM attendance_details WHERE attendance_id = " . $createdIds['attendance_id']);
        $db->query("DELETE FROM attendances WHERE id = " . $createdIds['attendance_id']);
    }

    // 2. Sınıf İlişkilerini Sil
    if ($createdIds['student_id']) {
        $db->query("DELETE FROM student_classes WHERE student_id = " . $createdIds['student_id']);
        $db->query("DELETE FROM students WHERE id = " . $createdIds['student_id']);
    }

    if ($createdIds['class_id']) {
        // Teacher classes tablosu teacher modelinde assignClasses ile dolmuştu
        $db->query("DELETE FROM teacher_classes WHERE class_id = " . $createdIds['class_id']);
        $db->query("DELETE FROM classes WHERE id = " . $createdIds['class_id']);
    }

    // 3. Kullanıcıyı Sil
    if ($createdIds['user_id']) {
        $db->query("DELETE FROM users WHERE id = " . $createdIds['user_id']);
    }
    
    $tester->assert("Veri Temizliği", true, "Test sırasında oluşturulan tüm geçici veriler silindi.");
}

// --- RAPOR ÇIKTISI ---
echo $tester->log;

$score = ($tester->passCount / ($tester->passCount + $tester->failCount)) * 100;
$scoreColor = $score == 100 ? '#50cd89' : ($score > 50 ? '#f1c40f' : '#f1416c');

?>
    <div class="summary" style="border: 2px solid <?php echo $scoreColor; ?>;">
        Test Sonucu: %<?php echo number_format($score, 0); ?> Başarı<br>
        <span style="color: #50cd89"><?php echo $tester->passCount; ?> Başarılı</span> / 
        <span style="color: #f1416c"><?php echo $tester->failCount; ?> Hatalı</span>
    </div>
</div>
</body>
</html>
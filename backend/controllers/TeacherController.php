<?php
// Teacher Controller for Attendify
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../models/Student.php';
require_once __DIR__ . '/../models/Class.php';
require_once __DIR__ . '/../models/Attendance.php';
require_once __DIR__ . '/../models/Teacher.php'; 
require_once __DIR__ . '/../utils/Response.php';
require_once __DIR__ . '/../middleware/auth.php';

class TeacherController {
    private $db;
    private $userModel;
    private $studentModel;
    private $classModel;
    private $attendanceModel;
    private $teacherModel; 

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
        $this->userModel = new User($this->db);
        $this->studentModel = new Student($this->db);
        $this->classModel = new ClassModel($this->db); 
        $this->attendanceModel = new Attendance($this->db);
        $this->teacherModel = new Teacher($this->db); 
    }

    // ... (Admin İşlemleri - Aynı kalacak) ...
    public function adminGetTeachers() {
        AuthMiddleware::requireAdmin();
        $teachers = $this->userModel->getAllByRole('teacher'); 
        foreach ($teachers as &$teacher) {
            $teacher['classes'] = $this->teacherModel->getAssignedClasses($teacher['id']);
        }
        Response::success($teachers);
    }
    public function adminCreateTeacher() {
        AuthMiddleware::requireAdmin();
        $data = json_decode(file_get_contents("php://input"), true);
        $userId = $this->userModel->create([
            'username' => $data['username'],
            'password' => $data['password'], 
            'email' => $data['email'],
            'full_name' => $data['full_name'],
            'phone' => $data['phone'] ?? '',
            'role' => 'teacher',
            'birth_date' => $data['birth_date'] ?? null
        ]);
        if ($userId) {
            if (isset($data['class_ids']) && is_array($data['class_ids'])) {
                $this->teacherModel->assignClasses($userId, $data['class_ids']);
            }
            Response::success(['id' => $userId], "Teacher created and classes assigned successfully", 201);
        } else {
            Response::serverError("Failed to create teacher user");
        }
    }
    public function adminUpdateTeacher() {
        AuthMiddleware::requireAdmin();
        $id = $_GET['id'] ?? null;
        if (!$id) Response::error("Teacher ID required", 400);
        $data = json_decode(file_get_contents("php://input"), true);
        $updateData = [
            'username' => $data['username'],
            'email' => $data['email'],
            'full_name' => $data['full_name'],
            'phone' => $data['phone'],
            'birth_date' => $data['birth_date']
        ];
        if (!empty($data['password'])) {
            $updateData['password'] = $data['password'];
        }
        if ($this->userModel->update($id, $updateData)) {
            if (isset($data['class_ids']) && is_array($data['class_ids'])) {
                $this->teacherModel->assignClasses($id, $data['class_ids']);
            }
            Response::success(null, "Teacher and class assignments updated successfully");
        } else {
            Response::serverError("Failed to update teacher");
        }
    }
    public function adminDeactivateTeacher() {
        AuthMiddleware::requireAdmin();
        $id = $_GET['id'] ?? null;
        if (!$id) Response::error("Teacher ID required", 400);
        if ($this->userModel->deactivate($id)) {
            Response::success(null, "Teacher deactivated successfully");
        } else {
            Response::serverError("Failed to deactivate teacher");
        }
    }
    public function adminActivateTeacher() {
        AuthMiddleware::requireAdmin();
        $id = $_GET['id'] ?? null;
        if (!$id) Response::error("Teacher ID required", 400);
        if ($this->userModel->activate($id)) {
            Response::success(null, "Teacher activated successfully");
        } else {
            Response::serverError("Failed to activate teacher");
        }
    }

    // ... (Profil ve Feedback İşlemleri - Aynı kalacak) ...
    public function getProfile() {
        $user = AuthMiddleware::requireTeacher();
        $userId = $user['id'] ?? $user['user_id']; 
        $profile = $this->userModel->getById($userId);
        $classes = $this->teacherModel->getAssignedClasses($userId);
        $profile['class_count'] = count($classes);
        $uniqueStudentIds = [];
        foreach ($classes as $cls) {
            $students = $this->classModel->getStudents($cls['id']);
            foreach ($students as $s) {
                $uniqueStudentIds[$s['id']] = true; 
            }
        }
        $profile['student_count'] = count($uniqueStudentIds);
        Response::success($profile);
    }
    public function updateProfile() {
        $user = AuthMiddleware::requireTeacher();
        $userId = $user['id'] ?? $user['user_id'];
        $data = json_decode(file_get_contents("php://input"), true);
        if ($this->userModel->update($userId, $data)) {
            Response::success(null, "Profile updated successfully");
        } else {
            Response::serverError("Failed to update profile");
        }
    }
    public function sendFeedback() {
        $user = AuthMiddleware::requireTeacher();
        $userId = $user['id'] ?? $user['user_id'];
        $data = json_decode(file_get_contents("php://input"), true);
        if (!isset($data['subject']) || !isset($data['message'])) {
            Response::error("Subject and message are required", 400);
        }
        $query = "INSERT INTO feedbacks (teacher_id, subject, message, type) 
                  VALUES (:teacher_id, :subject, :message, :type)";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':teacher_id', $userId);
        $stmt->bindParam(':subject', $data['subject']);
        $stmt->bindParam(':message', $data['message']);
        $type = $data['type'] ?? 'feedback';
        $stmt->bindParam(':type', $type);
        if ($stmt->execute()) {
            Response::success(null, "Feedback sent successfully", 201);
        } else {
            Response::serverError("Failed to send feedback");
        }
    }
    public function getSentFeedbacks() {
        $user = AuthMiddleware::requireTeacher();
        $userId = $user['id'] ?? $user['user_id'];
        $query = "SELECT * FROM feedbacks 
                  WHERE teacher_id = :teacher_id 
                  AND created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH) 
                  ORDER BY created_at DESC";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':teacher_id', $userId);
        $stmt->execute();
        Response::success($stmt->fetchAll());
    }

    // ... (Sınıf ve Öğrenci İşlemleri - Aynı kalacak) ...
    public function getMyClasses() {
        $user = AuthMiddleware::requireTeacher();
        $userId = $user['id'] ?? $user['user_id'];
        $classes = $this->teacherModel->getAssignedClasses($userId);
        foreach ($classes as &$class) {
            $class['students'] = $this->classModel->getStudents($class['id']);
            if(isset($class['weekly_schedule'])) {
                $class['schedule'] = $class['weekly_schedule'];
            }
        }
        Response::success($classes);
    }
    public function getClassDetails($classId) {
        $user = AuthMiddleware::requireTeacher();
        $userId = $user['id'] ?? $user['user_id'];
        $class = $this->classModel->getById($classId);
        if (!$class) {
            Response::notFound("Class not found");
        }
        $teacherClasses = $this->teacherModel->getAssignedClasses($userId);
        $hasAccess = false;
        foreach ($teacherClasses as $tc) {
            if ($tc['id'] == $classId) {
                $hasAccess = true;
                break;
            }
        }
        if (!$hasAccess) {
            Response::forbidden("You don't have access to this class");
        }
        $class['students'] = $this->classModel->getStudents($classId);
        $class['recent_attendances'] = $this->attendanceModel->getByClass($classId, 30);
        Response::success($class);
    }
    public function getMyStudents() {
        $user = AuthMiddleware::requireTeacher();
        $userId = $user['id'] ?? $user['user_id'];
        $classes = $this->teacherModel->getAssignedClasses($userId);
        $studentMap = [];
        foreach ($classes as $class) {
            $students = $this->classModel->getStudents($class['id']);
            foreach ($students as $student) {
                $sId = $student['id'];
                if (!isset($studentMap[$sId])) {
                    $studentMap[$sId] = $student;
                    $studentMap[$sId]['classes'] = []; 
                }
                $classInfo = [
                    'id' => $class['id'],
                    'class_name' => $class['class_name'],
                    'class_code' => $class['class_code'],
                    'absences_count' => $student['absences_count'],
                    'remaining_absences' => $student['remaining_absences']
                ];
                $studentMap[$sId]['classes'][] = $classInfo;
            }
        }
        $allStudents = array_values($studentMap);
        usort($allStudents, function($a, $b) {
            return strcmp($a['first_name'], $b['first_name']);
        });
        Response::success($allStudents);
    }

    // ... (Yoklama İşlemleri - Aynı kalacak) ...
    public function startAttendance() {
        $user = AuthMiddleware::requireTeacher();
        Response::success([], "Started");
    }
    public function submitAttendance() {
        $user = AuthMiddleware::requireTeacher();
        $teacherId = $user['id'] ?? $user['user_id'];
        $data = json_decode(file_get_contents("php://input"), true);
        if (!isset($data['class_id']) || !isset($data['students'])) {
            Response::error("Eksik veri: class_id ve students listesi zorunludur.", 400);
        }
        try {
            $this->db->beginTransaction();
            $totalStudents = count($data['students']);
            $presentCount = 0;
            foreach ($data['students'] as $s) {
                if ($s['status'] === 'present') $presentCount++;
            }
            $absentCount = $totalStudents - $presentCount;
            $duration = $data['duration_minutes'] ?? 0;
            $query = "INSERT INTO attendances 
                      (class_id, teacher_id, attendance_date, attendance_time, duration_minutes, total_students, present_count, absent_count) 
                      VALUES (:class_id, :teacher_id, CURDATE(), CURTIME(), :duration, :total, :present, :absent)";
            $stmt = $this->db->prepare($query);
            $stmt->execute([
                ':class_id' => $data['class_id'],
                ':teacher_id' => $teacherId,
                ':duration' => $duration,
                ':total' => $totalStudents,
                ':present' => $presentCount,
                ':absent' => $absentCount
            ]);
            $attendanceId = $this->db->lastInsertId();
            $detailQuery = "INSERT INTO attendance_details (attendance_id, student_id, status) VALUES (:att_id, :st_id, :status)";
            $detailStmt = $this->db->prepare($detailQuery);
            foreach ($data['students'] as $student) {
                if (!isset($student['student_id']) || !isset($student['status'])) continue;
                $detailStmt->execute([
                    ':att_id' => $attendanceId,
                    ':st_id' => $student['student_id'],
                    ':status' => $student['status']
                ]);
                if ($student['status'] === 'absent') {
                    $this->studentModel->incrementAbsence($student['student_id'], $data['class_id']);
                }
            }
            $this->db->commit();
            Response::success(null, "Yoklama başarıyla kaydedildi.");
        } catch (Exception $e) {
            $this->db->rollBack();
            Response::serverError("Kayıt hatası: " . $e->getMessage());
        }
    }
    public function getMyAttendances() {
        $user = AuthMiddleware::requireTeacher();
        $userId = $user['id'] ?? $user['user_id'];
        $days = $_GET['days'] ?? 30;
        $attendances = $this->attendanceModel->getByTeacher($userId, $days);
        Response::success($attendances);
    }
    public function getAttendanceDetails($attendanceId) {
        $user = AuthMiddleware::requireTeacher();
        $userId = $user['id'] ?? $user['user_id'];
        $attendance = $this->attendanceModel->getById($attendanceId);
        if (!$attendance) {
            Response::notFound("Attendance record not found");
        }
        if ($attendance['teacher_id'] != $userId && $user['role'] !== 'admin') {
            Response::forbidden("You don't have access to this attendance record");
        }
        $attendance['details'] = $this->attendanceModel->getDetails($attendanceId);
        Response::success($attendance);
    }

    // --- YENİ EKLENEN: SINAV İŞLEMLERİ ---
    public function getExams() {
        $user = AuthMiddleware::requireTeacher();
        $teacherId = $user['id'] ?? $user['user_id'];

        // Öğretmenin sorumlu olduğu sınıflara ait sınavları getir
        $query = "SELECT e.*, c.class_name, c.class_code 
                  FROM exams e
                  JOIN classes c ON e.class_id = c.id
                  JOIN teacher_classes tc ON c.id = tc.class_id
                  WHERE tc.teacher_id = :teacher_id
                  ORDER BY e.exam_date ASC";
        
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':teacher_id', $teacherId);
        $stmt->execute();
        $exams = $stmt->fetchAll(PDO::FETCH_ASSOC);

        Response::success($exams);
    }

    public function getExamDetails($id) {
        AuthMiddleware::requireTeacher();
        
        // Exam modelini manuel olarak dahil ediyoruz
        require_once __DIR__ . '/../models/Exam.php';
        $examModel = new Exam($this->db);
        
        $data = $examModel->getDetails($id);
        
        if ($data) {
            Response::success($data);
        } else {
            Response::notFound("Sınav bulunamadı.");
        }
    }
}

// Handle requests
$controller = new TeacherController();
$method = $_SERVER['REQUEST_METHOD'];

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost:3000');
header('Access-Control-Allow-Methods: POST, GET, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

if ($method === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    $action = $_GET['action'] ?? '';
    $id = $_GET['id'] ?? null;

    switch ($action) {
        case 'admin-list': 
            if ($method === 'GET') $controller->adminGetTeachers();
            break;
        case 'admin-create':
            if ($method === 'POST') $controller->adminCreateTeacher();
            break;
        case 'admin-update':
            if ($method === 'PUT') $controller->adminUpdateTeacher();
            break;
        case 'admin-deactivate':
            if ($method === 'POST') $controller->adminDeactivateTeacher(); 
            break;
        case 'admin-activate':
            if ($method === 'POST') $controller->adminActivateTeacher();
            break;

        case 'profile':
            if ($method === 'GET') $controller->getProfile();
            elseif ($method === 'PUT') $controller->updateProfile();
            break;
        case 'feedback':
            if ($method === 'POST') $controller->sendFeedback();
            break;
        case 'feedback-history':
            if ($method === 'GET') $controller->getSentFeedbacks();
            break;
            
        case 'classes':
            if ($method === 'GET' && $id) $controller->getClassDetails($id);
            elseif ($method === 'GET') $controller->getMyClasses();
            break;
        case 'students':
            if ($method === 'GET') $controller->getMyStudents();
            break;
        case 'attendance-start':
            if ($method === 'POST') $controller->startAttendance();
            break;
        case 'attendance-submit':
            if ($method === 'POST') $controller->submitAttendance();
            break;
        case 'attendances':
            if ($method === 'GET' && $id) $controller->getAttendanceDetails($id);
            elseif ($method === 'GET') $controller->getMyAttendances();
            break;
            
        // --- YENİ EKLENEN CASE'LER ---
        case 'exams':
            if ($method === 'GET') $controller->getExams();
            break;
        case 'exam-details':
            if ($method === 'GET' && $id) $controller->getExamDetails($id);
            break;

        default:
            Response::notFound("Invalid endpoint: $action");
    }
} catch (Exception $e) {
    Response::serverError($e->getMessage());
}
?>
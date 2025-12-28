<?php
// Class Controller for Attendify
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../models/Class.php';
require_once __DIR__ . '/../utils/Response.php';
require_once __DIR__ . '/../utils/Validator.php';
require_once __DIR__ . '/../middleware/auth.php';

class ClassController {
    private $db;
    private $classModel;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
        $this->classModel = new ClassModel($this->db);
    }

    // Get all classes
    public function getClasses() {
        // 1. LİSTELEMEDEN ÖNCE TEMİZLİĞİ ÇAĞIR
        $this->cleanupExpiredMakeups();

        // 2. NORMAL LİSTELEME İŞLEMİ
        AuthMiddleware::requireAdmin();
        $activeOnly = isset($_GET['active']) ? (bool)$_GET['active'] : true;
        $classes = $this->classModel->getAll($activeOnly);
        Response::success($classes);
    }

    // Get single class
    public function getClass($id) {
        AuthMiddleware::requireAdmin();
        $class = $this->classModel->getById($id);
        if (!$class) Response::notFound("Class not found");
        
        $class['teachers'] = $this->classModel->getTeachers($id);
        $class['students'] = $this->classModel->getStudents($id);
        
        // Schedule verisini weekly_schedule sütunundan alıp schedule olarak verelim
        if (isset($class['weekly_schedule'])) {
            $class['schedule'] = $class['weekly_schedule'];
        }
        
        Response::success($class);
    }

    // Create class
    public function createClass() {
        AuthMiddleware::requireAdmin();
        $data = json_decode(file_get_contents("php://input"), true);

        $errors = Validator::validateRequired(['class_name', 'class_code'], $data);
        if (!empty($errors)) Response::error("Validation failed", 400, $errors);

        if ($this->classModel->classCodeExists($data['class_code'])) {
            Response::error("Class code already exists", 400);
        }

        $classId = $this->classModel->create($data);

        if ($classId) {
            Response::success(['id' => $classId], "Class created successfully", 201);
        } else {
            Response::serverError("Failed to create class");
        }
    }

    // Update class
    public function updateClass($id) {
        AuthMiddleware::requireAdmin();
        
        $rawInput = file_get_contents("php://input");
        $data = json_decode($rawInput, true);
        
        $class = $this->classModel->getById($id);
        if (!$class) Response::notFound("Class not found");

        if ($this->classModel->update($id, $data)) {
            Response::success(null, "Class updated successfully");
        } else {
            Response::serverError("Failed to update class");
        }
    }

    // Delete class
    public function deleteClass($id) {
        AuthMiddleware::requireAdmin();
        $class = $this->classModel->getById($id);
        if (!$class) Response::notFound("Class not found");

        if ($this->classModel->delete($id)) {
            Response::success(null, "Class deleted successfully");
        } else {
            Response::serverError("Failed to delete class");
        }
    }

    // --- YARDIMCI FONKSİYON: Süresi dolan Make-up dersleri temizle ---
    private function cleanupExpiredMakeups() {
        try {
            // Veritabanındaki sütun adı 'weekly_schedule' olduğu için onu kullanıyoruz
            $query = "SELECT id, weekly_schedule FROM classes WHERE weekly_schedule LIKE '%makeup%'";
            $stmt = $this->db->prepare($query);
            $stmt->execute();
            $classes = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $now = time(); 
            $sevenDaysInSeconds = 7 * 24 * 60 * 60; // 7 gün = 604800 saniye

            foreach ($classes as $class) {
                // JSON verisini diziye çevir
                $schedule = json_decode($class['weekly_schedule'], true);
                
                if (!is_array($schedule)) continue;

                $newSchedule = [];
                $hasChanges = false;

                foreach ($schedule as $slot) {
                    // Bu bir make-up dersi mi?
                    if (isset($slot['type']) && $slot['type'] === 'makeup') {
                        // Tarihi var mı?
                        if (isset($slot['created_at'])) {
                            $createdTime = strtotime($slot['created_at']);
                            
                            // 7 günden eskiyse, yeni listeye EKLEME (yani sil)
                            if (($now - $createdTime) > $sevenDaysInSeconds) {
                                $hasChanges = true;
                                continue; 
                            }
                        }
                    }
                    // Diğer tüm dersleri (normal veya süresi dolmamış) koru
                    $newSchedule[] = $slot;
                }

                // Değişiklik varsa veritabanını güncelle
                if ($hasChanges) {
                    $updatedJson = json_encode($newSchedule);
                    $updateQuery = "UPDATE classes SET weekly_schedule = :schedule WHERE id = :id";
                    $updateStmt = $this->db->prepare($updateQuery);
                    $updateStmt->execute([
                        ':schedule' => $updatedJson,
                        ':id' => $class['id']
                    ]);
                }
            }
        } catch (Exception $e) {
            // Hata olursa loga yaz ama kullanıcıya hata gösterme (arka plan işlemi)
            error_log("Cleanup Error: " . $e->getMessage());
        }
    }
}

// Handle requests
$controller = new ClassController();
$method = $_SERVER['REQUEST_METHOD'];

try {
    $action = $_GET['action'] ?? '';
    $id = $_GET['id'] ?? null;

    switch ($action) {
        case 'classes':
            if ($method === 'POST') $controller->createClass();
            elseif ($method === 'GET' && $id) $controller->getClass($id);
            elseif ($method === 'GET') $controller->getClasses();
            elseif ($method === 'PUT' && $id) $controller->updateClass($id);
            elseif ($method === 'DELETE' && $id) $controller->deleteClass($id);
            break;
        default:
            Response::notFound("Invalid endpoint");
    }
} catch (Exception $e) {
    Response::serverError($e->getMessage());
}
?>
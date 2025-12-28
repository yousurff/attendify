<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/Response.php';
require_once __DIR__ . '/../middleware/auth.php';

class AttendanceController {
    private $db;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
    }

    // --- TÜM YOKLAMA KAYITLARINI GETİR (ADMİN İÇİN - SON 1 AY) ---
    public function getAllAttendances() {
        AuthMiddleware::requireAdmin(); // Sadece Admin erişebilir

        try {
            // İlişkisel Sorgu: attendances tablosunu classes ve users (öğretmen) ile birleştiriyoruz.
            // VE SADECE SON 1 AYIN VERİLERİNİ ÇEKİYORUZ.
            $query = "
                SELECT 
                    a.id,
                    a.attendance_date,
                    a.attendance_time,
                    a.duration_minutes,
                    a.total_students,
                    a.present_count,
                    a.absent_count,
                    a.created_at,
                    c.class_name,
                    c.class_code,
                    u.full_name as teacher_name
                FROM attendances a
                LEFT JOIN classes c ON a.class_id = c.id
                LEFT JOIN users u ON a.teacher_id = u.id
                WHERE a.attendance_date >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)
                ORDER BY a.created_at DESC
            ";

            $stmt = $this->db->prepare($query);
            $stmt->execute();
            $attendances = $stmt->fetchAll(PDO::FETCH_ASSOC);

            Response::success($attendances);
        } catch (Exception $e) {
            Response::serverError("Yoklama kayıtları alınamadı: " . $e->getMessage());
        }
    }
}

// İstekleri Yönetme (Routing)
$controller = new AttendanceController();
$method = $_SERVER['REQUEST_METHOD'];

try {
    // URL'den action parametresini al (örn: index.php?action=attendances)
    $action = $_GET['action'] ?? '';

    switch ($action) {
        case 'attendances':
            if ($method === 'GET') {
                $controller->getAllAttendances();
            } else {
                Response::methodNotAllowed();
            }
            break;
            
        default:
            // Bu dosya yeni olduğu için henüz başka endpoint yok.
            // İleride buraya başka case'ler eklenebilir.
            Response::notFound("Invalid endpoint for Attendance");
            break;
    }
} catch (Exception $e) {
    Response::serverError($e->getMessage());
}
?>
<?php
// Authentication Controller for Attendify
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../utils/Response.php';
require_once __DIR__ . '/../utils/Validator.php';
require_once __DIR__ . '/../middleware/auth.php';

class AuthController {
    private $db;
    private $userModel;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
        $this->userModel = new User($this->db);
    }

    public function login() {
        $data = json_decode(file_get_contents("php://input"), true);

        if (!isset($data['username']) || !isset($data['password'])) {
            Response::error("Username and password are required", 400);
        }

        $username = Validator::sanitizeString($data['username']);
        $password = $data['password'];

        $user = $this->userModel->authenticate($username, $password);

        if (!$user) {
            Response::error("Invalid credentials", 401);
        }

        AuthMiddleware::startSession($user['id'], $user['username'], $user['role']);

        // Update login statistics
        $this->updateLoginStats();

        Response::success([
            'user' => $user,
            'token' => session_id()
        ], "Login successful");
    }

    public function logout() {
        AuthMiddleware::destroySession();
        Response::success(null, "Logged out successfully");
    }

    public function checkAuth() {
        if (!AuthMiddleware::checkSession()) {
            Response::error("Not authenticated", 401);
        }

        $user = AuthMiddleware::authenticate();
        $userData = $this->userModel->getById($user['user_id']);

        Response::success(['user' => $userData], "Authenticated");
    }

    public function changePassword() {
        $user = AuthMiddleware::authenticate();
        $data = json_decode(file_get_contents("php://input"), true);

        if (!isset($data['current_password']) || !isset($data['new_password'])) {
            Response::error("Current and new password are required", 400);
        }

        // Verify current password
        $userData = $this->userModel->getById($user['user_id']);
        $stmt = $this->db->prepare("SELECT password FROM users WHERE id = :id");
        $stmt->bindParam(':id', $user['user_id']);
        $stmt->execute();
        $result = $stmt->fetch();

        if (!password_verify($data['current_password'], $result['password'])) {
            Response::error("Current password is incorrect", 400);
        }

        if (!Validator::validatePassword($data['new_password'])) {
            Response::error("New password must be at least 6 characters", 400);
        }

        if ($this->userModel->updatePassword($user['user_id'], $data['new_password'])) {
            Response::success(null, "Password changed successfully");
        } else {
            Response::serverError("Failed to change password");
        }
    }

    private function updateLoginStats() {
        try {
            $today = date('Y-m-d');
            
            $query = "INSERT INTO system_stats (stat_date, daily_logins) 
                      VALUES (:stat_date, 1)
                      ON DUPLICATE KEY UPDATE 
                      daily_logins = daily_logins + 1,
                      weekly_logins = weekly_logins + 1,
                      monthly_logins = monthly_logins + 1";
            
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':stat_date', $today);
            $stmt->execute();
        } catch (Exception $e) {
            error_log("Failed to update login stats: " . $e->getMessage());
        }
    }
}

// Handle requests
$controller = new AuthController();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost:3000');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

if ($method === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    switch ($action) {
        case 'login':
            if ($method === 'POST') {
                $controller->login();
            }
            break;
        case 'logout':
            if ($method === 'POST') {
                $controller->logout();
            }
            break;
        case 'check':
            if ($method === 'GET') {
                $controller->checkAuth();
            }
            break;
        case 'change-password':
            if ($method === 'POST') {
                $controller->changePassword();
            }
            break;
        default:
            Response::notFound("Invalid endpoint");
    }
} catch (Exception $e) {
    Response::serverError($e->getMessage());
}
?>
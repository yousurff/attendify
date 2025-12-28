<?php
// Authentication Middleware for Attendify
require_once __DIR__ . '/../utils/Response.php';

class AuthMiddleware {
    
    public static function authenticate() {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        if (!isset($_SESSION['user_id']) || !isset($_SESSION['role'])) {
            Response::unauthorized("Please login to continue");
        }

        return [
            'user_id' => $_SESSION['user_id'],
            'role' => $_SESSION['role'],
            'username' => $_SESSION['username'] ?? null
        ];
    }

    public static function requireAdmin() {
        $user = self::authenticate();
        
        if ($user['role'] !== 'admin') {
            Response::forbidden("Admin access required");
        }

        return $user;
    }

    public static function requireTeacher() {
        $user = self::authenticate();
        
        if ($user['role'] !== 'teacher' && $user['role'] !== 'admin') {
            Response::forbidden("Teacher access required");
        }

        return $user;
    }

    public static function startSession($userId, $username, $role) {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        session_regenerate_id(true);
        
        $_SESSION['user_id'] = $userId;
        $_SESSION['username'] = $username;
        $_SESSION['role'] = $role;
        $_SESSION['login_time'] = time();
    }

    public static function destroySession() {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        session_unset();
        session_destroy();
    }

    public static function checkSession() {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        return isset($_SESSION['user_id']);
    }
}
?>
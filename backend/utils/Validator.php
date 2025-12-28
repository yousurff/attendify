<?php
// Validator Utility for Attendify
class Validator {
    
    public static function validateEmail($email) {
        return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }

    public static function validatePhone($phone) {
        return preg_match('/^[0-9]{10,15}$/', $phone);
    }

    public static function validateDate($date, $format = 'Y-m-d') {
        $d = DateTime::createFromFormat($format, $date);
        return $d && $d->format($format) === $date;
    }

    public static function validateRequired($fields, $data) {
        $errors = [];
        foreach ($fields as $field) {
            if (!isset($data[$field]) || empty(trim($data[$field]))) {
                $errors[] = ucfirst($field) . " is required";
            }
        }
        return $errors;
    }

    public static function sanitizeString($string) {
        return htmlspecialchars(strip_tags(trim($string)));
    }

    public static function validateLength($string, $min, $max) {
        $length = strlen($string);
        return $length >= $min && $length <= $max;
    }

    public static function validatePassword($password) {
        return strlen($password) >= 6;
    }

    public static function validateUsername($username) {
        return preg_match('/^[a-zA-Z0-9_]{3,50}$/', $username);
    }
}
?>
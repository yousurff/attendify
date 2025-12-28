<?php
// Response Utility for Attendify API
class Response {
    
    public static function success($data = null, $message = "Success", $statusCode = 200) {
        http_response_code($statusCode);
        echo json_encode([
            'success' => true,
            'message' => $message,
            'data' => $data
        ]);
        exit;
    }

    public static function error($message = "Error occurred", $statusCode = 400, $errors = null) {
        http_response_code($statusCode);
        $response = [
            'success' => false,
            'message' => $message
        ];
        
        if ($errors !== null) {
            $response['errors'] = $errors;
        }
        
        echo json_encode($response);
        exit;
    }

    public static function unauthorized($message = "Unauthorized access") {
        self::error($message, 401);
    }

    public static function forbidden($message = "Forbidden") {
        self::error($message, 403);
    }

    public static function notFound($message = "Resource not found") {
        self::error($message, 404);
    }

    public static function serverError($message = "Internal server error") {
        self::error($message, 500);
    }
}
?>
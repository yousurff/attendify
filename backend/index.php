<?php
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed = ['http://localhost:3000'];
if (in_array($origin, $allowed, true)) {
  header("Access-Control-Allow-Origin: $origin");
} else {
  header("Access-Control-Allow-Origin: http://localhost:3000");
}

header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(200);
  exit;
}

session_start();

$requestUri = $_SERVER['REQUEST_URI'] ?? '/';

// hem /attendify/backend/... hem /attendify/backend/index.php/... destekle
$basePaths = ['/attendify/backend/index.php', '/attendify/backend'];

$route = $requestUri;
foreach ($basePaths as $bp) {
  if (strpos($route, $bp) === 0) {
    $route = substr($route, strlen($bp));
    break;
  }
}

$route = strtok($route, '?');
$route = $route ?: '/';

try {
  switch (true) {
    case preg_match('#^/auth#', $route):
      require_once __DIR__ . '/controllers/AuthController.php';
      break;

    case preg_match('#^/admin#', $route):
      require_once __DIR__ . '/controllers/AdminController.php';
      break;

    case preg_match('#^/teacher#', $route):
      require_once __DIR__ . '/controllers/TeacherController.php';
      break;

    // DÜZELTME: Diğerleri gibi preg_match kullanıldı
    case preg_match('#^/attendance#', $route):
        require_once __DIR__ . '/controllers/AttendanceController.php';
        break;

    case $route === '/' || $route === '':
      echo json_encode([
        'success' => true,
        'message' => 'Attendify API v1.0'
      ]);
      break;

    default:
      http_response_code(404);
      echo json_encode([
        'success' => false,
        'message' => 'Endpoint not found',
        'route' => $route
      ]);
      break;
  }
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode([
    'success' => false,
    'message' => 'Internal server error',
    'error' => $e->getMessage()
  ]);
}
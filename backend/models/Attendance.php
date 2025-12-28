<?php
// Attendance Model for Attendify
class Attendance {
    private $conn;
    private $table = 'attendances';

    public function __construct($db) {
        $this->conn = $db;
    }

    public function create($classId, $teacherId, $totalStudents) {
        $query = "INSERT INTO " . $this->table . " 
                  (class_id, teacher_id, attendance_date, attendance_time, total_students) 
                  VALUES (:class_id, :teacher_id, :attendance_date, :attendance_time, :total_students)";
        
        $stmt = $this->conn->prepare($query);
        
        $currentDate = date('Y-m-d');
        $currentTime = date('H:i:s');
        
        $stmt->bindParam(':class_id', $classId);
        $stmt->bindParam(':teacher_id', $teacherId);
        $stmt->bindParam(':attendance_date', $currentDate);
        $stmt->bindParam(':attendance_time', $currentTime);
        $stmt->bindParam(':total_students', $totalStudents);

        if ($stmt->execute()) {
            return $this->conn->lastInsertId();
        }
        return false;
    }

    public function addDetail($attendanceId, $studentId, $status) {
        $query = "INSERT INTO attendance_details (attendance_id, student_id, status) 
                  VALUES (:attendance_id, :student_id, :status)";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':attendance_id', $attendanceId);
        $stmt->bindParam(':student_id', $studentId);
        $stmt->bindParam(':status', $status);
        
        return $stmt->execute();
    }

    public function complete($attendanceId, $presentCount, $absentCount, $duration) {
        $query = "UPDATE " . $this->table . " 
                  SET present_count = :present_count, 
                      absent_count = :absent_count,
                      duration_minutes = :duration
                  WHERE id = :id";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $attendanceId);
        $stmt->bindParam(':present_count', $presentCount);
        $stmt->bindParam(':absent_count', $absentCount);
        $stmt->bindParam(':duration', $duration);
        
        return $stmt->execute();
    }

    public function getById($id) {
        $query = "SELECT a.*, c.class_name, c.class_code, u.full_name as teacher_name
                  FROM " . $this->table . " a
                  INNER JOIN classes c ON a.class_id = c.id
                  INNER JOIN users u ON a.teacher_id = u.id
                  WHERE a.id = :id LIMIT 1";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id);
        $stmt->execute();
        return $stmt->fetch();
    }

    public function getDetails($attendanceId) {
        $query = "SELECT ad.*, s.student_number, s.first_name, s.last_name
                  FROM attendance_details ad
                  INNER JOIN students s ON ad.student_id = s.id
                  WHERE ad.attendance_id = :attendance_id
                  ORDER BY s.first_name, s.last_name";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':attendance_id', $attendanceId);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public function getAll($limit = null) {
        $query = "SELECT a.*, c.class_name, c.class_code, u.full_name as teacher_name
                  FROM " . $this->table . " a
                  INNER JOIN classes c ON a.class_id = c.id
                  INNER JOIN users u ON a.teacher_id = u.id
                  ORDER BY a.attendance_date DESC, a.attendance_time DESC";
        
        if ($limit) {
            $query .= " LIMIT " . intval($limit);
        }
        
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public function getByTeacher($teacherId, $days = 30) {
        $query = "SELECT a.*, c.class_name, c.class_code
                  FROM " . $this->table . " a
                  INNER JOIN classes c ON a.class_id = c.id
                  WHERE a.teacher_id = :teacher_id 
                  AND a.attendance_date >= DATE_SUB(CURDATE(), INTERVAL :days DAY)
                  ORDER BY a.attendance_date DESC, a.attendance_time DESC";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':teacher_id', $teacherId);
        $stmt->bindParam(':days', $days);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public function getByClass($classId, $days = 30) {
        $query = "SELECT a.*, u.full_name as teacher_name
                  FROM " . $this->table . " a
                  INNER JOIN users u ON a.teacher_id = u.id
                  WHERE a.class_id = :class_id 
                  AND a.attendance_date >= DATE_SUB(CURDATE(), INTERVAL :days DAY)
                  ORDER BY a.attendance_date DESC, a.attendance_time DESC";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':class_id', $classId);
        $stmt->bindParam(':days', $days);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public function getByStudent($studentId, $classId = null) {
        $query = "SELECT a.*, c.class_name, c.class_code, u.full_name as teacher_name, ad.status
                  FROM " . $this->table . " a
                  INNER JOIN attendance_details ad ON a.id = ad.attendance_id
                  INNER JOIN classes c ON a.class_id = c.id
                  INNER JOIN users u ON a.teacher_id = u.id
                  WHERE ad.student_id = :student_id";
        
        if ($classId) {
            $query .= " AND a.class_id = :class_id";
        }
        
        $query .= " ORDER BY a.attendance_date DESC, a.attendance_time DESC";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':student_id', $studentId);
        if ($classId) {
            $stmt->bindParam(':class_id', $classId);
        }
        
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public function getStats($startDate = null, $endDate = null) {
        if (!$startDate) $startDate = date('Y-m-d', strtotime('-30 days'));
        if (!$endDate) $endDate = date('Y-m-d');
        
        $query = "SELECT 
                  COUNT(*) as total_attendances,
                  SUM(present_count) as total_present,
                  SUM(absent_count) as total_absent,
                  AVG(duration_minutes) as avg_duration,
                  COUNT(DISTINCT class_id) as classes_count,
                  COUNT(DISTINCT teacher_id) as teachers_count
                  FROM " . $this->table . "
                  WHERE attendance_date BETWEEN :start_date AND :end_date";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':start_date', $startDate);
        $stmt->bindParam(':end_date', $endDate);
        $stmt->execute();
        return $stmt->fetch();
    }
}
?>
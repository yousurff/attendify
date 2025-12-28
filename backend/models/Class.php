<?php
// Class Model for Attendify
// SÜRÜM: DEBUG MODU AÇIK (Sorunu bulmak için)
class ClassModel {
    private $conn;
    private $table = 'classes';

    public function __construct($db) {
        $this->conn = $db;
        // Hataları ekrana basması için modu açıyoruz
        $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    // --- YARDIMCI: LOGLAMA FONKSİYONU ---
    private function logDebug($message) {
        $logFile = __DIR__ . '/../debug_log.txt';
        $time = date('Y-m-d H:i:s');
        file_put_contents($logFile, "[$time] $message" . PHP_EOL, FILE_APPEND);
    }

    public function create($data) {
        $query = "INSERT INTO " . $this->table . " 
                  (class_name, class_code, description, max_absences, weekly_schedule) 
                  VALUES (:class_name, :class_code, :description, :max_absences, :weekly_schedule)";
        
        $stmt = $this->conn->prepare($query);
        
        // bindValue kullanıyoruz (Daha güvenli)
        $stmt->bindValue(':class_name', $data['class_name']);
        $stmt->bindValue(':class_code', $data['class_code']);
        $stmt->bindValue(':description', $data['description']);
        $stmt->bindValue(':max_absences', $data['max_absences']);
        
        $schedule = isset($data['schedule']) ? $data['schedule'] : null;
        $stmt->bindValue(':weekly_schedule', $schedule);

        if ($stmt->execute()) {
            return $this->conn->lastInsertId();
        }
        return false;
    }

    public function getById($id) {
        $query = "SELECT * FROM " . $this->table . " WHERE id = :id LIMIT 1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindValue(':id', $id);
        $stmt->execute();
        $class = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($class) {
            $class['schedule'] = isset($class['weekly_schedule']) ? $class['weekly_schedule'] : null;
        }
        return $class;
    }

    public function getAll($activeOnly = true) {
        $query = "SELECT c.*,
                  (SELECT COUNT(*) FROM student_classes WHERE class_id = c.id) as student_count,
                  (SELECT COUNT(*) FROM teacher_classes WHERE class_id = c.id) as teacher_count
                  FROM " . $this->table . " c WHERE 1=1";
        
        if ($activeOnly) {
            $query .= " AND c.is_active = 1";
        }
        
        $query .= " ORDER BY c.class_name ASC";
        
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $classes = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($classes as &$class) {
            $class['teachers'] = $this->getTeachers($class['id']);
            $class['students'] = $this->getStudents($class['id']);
            $class['schedule'] = isset($class['weekly_schedule']) ? $class['weekly_schedule'] : null;
        }
        return $classes;
    }

    // --- KRİTİK BÖLÜM: UPDATE ---
    public function update($id, $data) {
        // 1. Loglama: İşlem başladığını ve gelen veriyi yaz
        $schLog = isset($data['schedule']) ? "DOLU (" . strlen($data['schedule']) . " karakter)" : "BOŞ/NULL";
        $this->logDebug("UPDATE BAŞLADI - ID: $id. Gelen Schedule: $schLog");

        $query = "UPDATE " . $this->table . " 
                  SET class_name = :class_name, 
                      class_code = :class_code, 
                      description = :description, 
                      max_absences = :max_absences,
                      weekly_schedule = :weekly_schedule,
                      updated_at = NOW() 
                  WHERE id = :id";
        
        $stmt = $this->conn->prepare($query);
        
        $stmt->bindValue(':id', $id);
        $stmt->bindValue(':class_name', $data['class_name']);
        $stmt->bindValue(':class_code', $data['class_code']);
        $stmt->bindValue(':description', $data['description']);
        $stmt->bindValue(':max_absences', $data['max_absences']);
        
        $schedule = isset($data['schedule']) ? $data['schedule'] : null;
        $stmt->bindValue(':weekly_schedule', $schedule);

        try {
            $result = $stmt->execute();
            // 2. Loglama: Sonucu yaz
            $this->logDebug("UPDATE SONUCU: " . ($result ? "Başarılı" : "Başarısız"));
            return $result;
        } catch (PDOException $e) {
            // 3. Loglama: Hata varsa yaz
            $this->logDebug("UPDATE HATASI: " . $e->getMessage());
            return false;
        }
    }

    public function delete($id) {
        $query = "UPDATE " . $this->table . " SET is_active = 0 WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindValue(':id', $id);
        return $stmt->execute();
    }

    // Yardımcı Fonksiyonlar
    public function getTeachers($classId) {
        $query = "SELECT u.id, u.username, u.full_name, u.email, u.phone, tc.assigned_at
                  FROM users u
                  INNER JOIN teacher_classes tc ON u.id = tc.teacher_id
                  WHERE tc.class_id = :class_id AND u.is_active = 1
                  ORDER BY u.full_name";
        $stmt = $this->conn->prepare($query);
        $stmt->bindValue(':class_id', $classId);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getStudents($classId) {
        $query = "SELECT s.*, sc.absences_count, sc.enrolled_at,
                  (c.max_absences - sc.absences_count) as remaining_absences
                  FROM students s
                  INNER JOIN student_classes sc ON s.id = sc.student_id
                  INNER JOIN classes c ON sc.class_id = c.id
                  WHERE sc.class_id = :class_id AND s.is_active = 1
                  ORDER BY s.first_name, s.last_name";
        $stmt = $this->conn->prepare($query);
        $stmt->bindValue(':class_id', $classId);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    public function getSchedules($classId) { return []; }

    public function classCodeExists($classCode, $excludeId = null) {
        $query = "SELECT id FROM " . $this->table . " WHERE class_code = :class_code";
        if ($excludeId) {
            $query .= " AND id != :exclude_id";
        }
        $stmt = $this->conn->prepare($query);
        $stmt->bindValue(':class_code', $classCode);
        if ($excludeId) {
            $stmt->bindValue(':exclude_id', $excludeId);
        }
        $stmt->execute();
        return $stmt->rowCount() > 0;
    }
}
?>
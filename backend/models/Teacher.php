<?php
class Teacher {
    private $conn;
    private $table = 'users';
    private $relationTable = 'teacher_classes';

    public function __construct($db) {
        $this->conn = $db;
    }

    // MEVCUT FONKSİYON (Bunu da tutuyoruz, belki başka yerde lazım olur)
    public function getAssignedClassIds($teacherId) {
        $query = "SELECT class_id FROM " . $this->relationTable . " WHERE teacher_id = :teacher_id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':teacher_id', $teacherId);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_COLUMN);
    }

    // GÜNCELLENEN FONKSİYON: weekly_schedule EKLENDİ
    public function getAssignedClasses($teacherId) {
        // Classes tablosuyla JOIN yapıyoruz ve PROGRAMI DA (weekly_schedule) alıyoruz
        $query = "SELECT c.id, c.class_name, c.class_code, c.weekly_schedule 
                  FROM " . $this->relationTable . " tc
                  JOIN classes c ON tc.class_id = c.id
                  WHERE tc.teacher_id = :teacher_id";
                  
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':teacher_id', $teacherId);
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function assignClasses($teacherId, $classIds) {
        try {
            $this->conn->beginTransaction();

            $deleteQuery = "DELETE FROM " . $this->relationTable . " WHERE teacher_id = :teacher_id";
            $stmt = $this->conn->prepare($deleteQuery);
            $stmt->bindParam(':teacher_id', $teacherId);
            $stmt->execute();

            if (!empty($classIds) && is_array($classIds)) {
                $insertQuery = "INSERT INTO " . $this->relationTable . " (teacher_id, class_id) VALUES (:teacher_id, :class_id)";
                $stmt = $this->conn->prepare($insertQuery);

                foreach ($classIds as $classId) {
                    $stmt->bindParam(':teacher_id', $teacherId);
                    $stmt->bindParam(':class_id', $classId);
                    $stmt->execute();
                }
            }

            $this->conn->commit();
            return true;
        } catch (Exception $e) {
            $this->conn->rollBack();
            return false;
        }
    }
}
?>
<?php
// Student Model for Attendify
class Student {
    private $conn;
    private $table = 'students';

    public function __construct($db) {
        $this->conn = $db;
    }

    public function create($data) {
        $query = "INSERT INTO " . $this->table . " 
                  (student_number, first_name, last_name, email, phone, birth_date) 
                  VALUES (:student_number, :first_name, :last_name, :email, :phone, :birth_date)";
        
        $stmt = $this->conn->prepare($query);
        
        $stmt->bindParam(':student_number', $data['student_number']);
        $stmt->bindParam(':first_name', $data['first_name']);
        $stmt->bindParam(':last_name', $data['last_name']);
        $stmt->bindParam(':email', $data['email']);
        $stmt->bindParam(':phone', $data['phone']);
        $stmt->bindParam(':birth_date', $data['birth_date']);

        if ($stmt->execute()) {
            return $this->conn->lastInsertId();
        }
        return false;
    }

    public function getById($id) {
        $query = "SELECT * FROM " . $this->table . " WHERE id = :id LIMIT 1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id);
        $stmt->execute();
        return $stmt->fetch();
    }

    public function getAll($activeOnly = true) {
        $query = "SELECT s.*, 
                  (SELECT COUNT(*) FROM student_photos WHERE student_id = s.id) as photo_count
                  FROM " . $this->table . " s WHERE 1=1";
        
        if ($activeOnly) {
            $query .= " AND s.is_active = 1";
        }
        
        $query .= " ORDER BY s.first_name ASC, s.last_name ASC";
        
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public function update($id, $data) {
        $query = "UPDATE " . $this->table . " 
                  SET first_name = :first_name, last_name = :last_name, 
                      email = :email, phone = :phone, birth_date = :birth_date 
                  WHERE id = :id";
        
        $stmt = $this->conn->prepare($query);
        
        $stmt->bindParam(':id', $id);
        $stmt->bindParam(':first_name', $data['first_name']);
        $stmt->bindParam(':last_name', $data['last_name']);
        $stmt->bindParam(':email', $data['email']);
        $stmt->bindParam(':phone', $data['phone']);
        $stmt->bindParam(':birth_date', $data['birth_date']);

        return $stmt->execute();
    }

    public function deactivate($id) {
        $query = "UPDATE " . $this->table . " SET is_active = 0 WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id);
        return $stmt->execute();
    }

    public function activate($id) {
        $query = "UPDATE " . $this->table . " SET is_active = 1 WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id);
        return $stmt->execute();
    }

    public function addPhoto($studentId, $photoType, $photoPath) {
        $query = "INSERT INTO student_photos (student_id, photo_type, photo_path) 
                  VALUES (:student_id, :photo_type, :photo_path)";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':student_id', $studentId);
        $stmt->bindParam(':photo_type', $photoType);
        $stmt->bindParam(':photo_path', $photoPath);
        
        return $stmt->execute();
    }

    public function getPhotos($studentId) {
        $query = "SELECT * FROM student_photos WHERE student_id = :student_id ORDER BY photo_type";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':student_id', $studentId);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public function deletePhoto($photoId) {
        $query = "DELETE FROM student_photos WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $photoId);
        return $stmt->execute();
    }

    public function enrollClass($studentId, $classId) {
        $query = "INSERT INTO student_classes (student_id, class_id) 
                  VALUES (:student_id, :class_id)";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':student_id', $studentId);
        $stmt->bindParam(':class_id', $classId);
        
        return $stmt->execute();
    }

    public function unenrollClass($studentId, $classId) {
        $query = "DELETE FROM student_classes 
                  WHERE student_id = :student_id AND class_id = :class_id";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':student_id', $studentId);
        $stmt->bindParam(':class_id', $classId);
        
        return $stmt->execute();
    }

    public function getClasses($studentId) {
        $query = "SELECT c.*, sc.absences_count, sc.enrolled_at,
                  (c.max_absences - sc.absences_count) as remaining_absences
                  FROM classes c
                  INNER JOIN student_classes sc ON c.id = sc.class_id
                  WHERE sc.student_id = :student_id AND c.is_active = 1
                  ORDER BY c.class_name";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':student_id', $studentId);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public function incrementAbsence($studentId, $classId) {
        $query = "UPDATE student_classes 
                  SET absences_count = absences_count + 1 
                  WHERE student_id = :student_id AND class_id = :class_id";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':student_id', $studentId);
        $stmt->bindParam(':class_id', $classId);
        
        return $stmt->execute();
    }

    public function studentNumberExists($studentNumber, $excludeId = null) {
        $query = "SELECT id FROM " . $this->table . " WHERE student_number = :student_number";
        if ($excludeId) {
            $query .= " AND id != :exclude_id";
        }
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':student_number', $studentNumber);
        if ($excludeId) {
            $stmt->bindParam(':exclude_id', $excludeId);
        }
        
        $stmt->execute();
        return $stmt->rowCount() > 0;
    }

    public function assignClasses($studentId, $classIds) {
        try {
            // Transaction başlatmıyoruz çünkü Controller'da zaten bir transaction içinde olacak
            
            // 1. Önce eski ders kayıtlarını temizle
            $deleteQuery = "DELETE FROM student_classes WHERE student_id = :student_id";
            $stmt = $this->conn->prepare($deleteQuery);
            $stmt->bindParam(':student_id', $studentId);
            $stmt->execute();

            // 2. Yeni dersleri ekle
            if (!empty($classIds) && is_array($classIds)) {
                $insertQuery = "INSERT INTO student_classes (student_id, class_id) VALUES (:student_id, :class_id)";
                $stmt = $this->conn->prepare($insertQuery);

                foreach ($classIds as $classId) {
                    $stmt->bindParam(':student_id', $studentId);
                    $stmt->bindParam(':class_id', $classId);
                    $stmt->execute();
                }
            }
            return true;
        } catch (Exception $e) {
            return false;
        }
    }

}
?>
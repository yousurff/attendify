<?php
class Exam {
    private $conn;
    private $table = 'exams';
    private $seating_table = 'exam_seating';

    public function __construct($db) {
        $this->conn = $db;
    }

    // Sınavları Listele
    public function getAll($showPast = false) {
        $query = "SELECT e.*, c.class_name, c.class_code, 
                  (SELECT COUNT(*) FROM " . $this->seating_table . " es WHERE es.exam_id = e.id) as student_count
                  FROM " . $this->table . " e
                  JOIN classes c ON e.class_id = c.id ";
        
        if ($showPast) {
            $query .= "WHERE e.exam_date < CURDATE() ";
        } else {
            $query .= "WHERE e.exam_date >= CURDATE() ";
        }
        
        $query .= "ORDER BY e.exam_date ASC, e.exam_time ASC";

        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Yeni Sınav Oluştur
    public function create($class_id, $exam_name, $classroom, $exam_date, $exam_time) {
        $query = "INSERT INTO " . $this->table . " 
                  (class_id, exam_name, classroom, exam_date, exam_time) 
                  VALUES (:class_id, :exam_name, :classroom, :exam_date, :exam_time)";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':class_id', $class_id);
        $stmt->bindParam(':exam_name', $exam_name);
        $stmt->bindParam(':classroom', $classroom);
        $stmt->bindParam(':exam_date', $exam_date);
        $stmt->bindParam(':exam_time', $exam_time);

        if ($stmt->execute()) {
            return $this->conn->lastInsertId();
        }
        return false;
    }

    // Oturma Düzeni Kaydet (Toplu Insert)
    public function saveSeating($exam_id, $seatingArrangement) {
        if (empty($seatingArrangement)) return true;

        $query = "INSERT INTO " . $this->seating_table . " (exam_id, student_id, seat_number) VALUES ";
        $values = [];
        
        foreach ($seatingArrangement as $seat) {
            $values[] = "($exam_id, {$seat['student_id']}, {$seat['seat_number']})";
        }
        
        $query .= implode(", ", $values);
        $stmt = $this->conn->prepare($query);
        return $stmt->execute();
    }

    // --- DETAYLARI VE OTURMA DÜZENİNİ GETİR ---
    public function getDetails($id) {
        // 1. Sınav Bilgisi
        $query = "SELECT e.*, c.class_name, c.class_code 
                  FROM " . $this->table . " e 
                  JOIN classes c ON e.class_id = c.id 
                  WHERE e.id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id);
        $stmt->execute();
        $exam = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$exam) return null;

        // 2. Oturma Düzeni (Öğrenci isimleriyle beraber)
        $querySeat = "SELECT es.seat_number, s.first_name, s.last_name, s.student_number, s.id as student_id
                      FROM " . $this->seating_table . " es
                      JOIN students s ON es.student_id = s.id
                      WHERE es.exam_id = :id
                      ORDER BY es.seat_number ASC";
        $stmtSeat = $this->conn->prepare($querySeat);
        $stmtSeat->bindParam(':id', $id);
        $stmtSeat->execute();
        $seating = $stmtSeat->fetchAll(PDO::FETCH_ASSOC);

        return ['exam' => $exam, 'seating' => $seating];
    }

    public function delete($id) {
        $query = "DELETE FROM " . $this->table . " WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id);
        return $stmt->execute();
    }
}
?>
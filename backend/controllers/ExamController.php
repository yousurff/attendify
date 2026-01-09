<?php
require_once __DIR__ . '/../models/Exam.php';
// Class.php'ye artık ihtiyacımız yok çünkü sorguyu burada yapacağız
require_once __DIR__ . '/../utils/Response.php';

class ExamController {
    private $db;
    private $examModel;

    public function __construct($db) {
        $this->db = $db;
        $this->examModel = new Exam($db);
    }

    // Sınavları Listele
    public function index($showPast) {
        $exams = $this->examModel->getAll($showPast);
        Response::success($exams);
    }

    // Yeni Sınav ve Oturma Düzeni Oluştur
    public function store($data) {
        // Gelen veriyi kontrol et
        if (empty($data['class_id']) || empty($data['exam_date']) || empty($data['classroom'])) {
            Response::error('Eksik veri: Sınıf, tarih veya derslik seçilmedi.', 400);
            return;
        }

        // 1. Önce Sınıftaki Öğrencileri Çek (Doğrudan SQL ile)
        // Eğer öğrenci yoksa boşuna sınav oluşturmayalım.
        $query = "SELECT s.id, s.first_name, s.last_name, s.student_number 
                  FROM students s 
                  JOIN student_classes sc ON s.id = sc.student_id 
                  WHERE sc.class_id = :class_id AND s.is_active = 1";
        
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':class_id', $data['class_id']);
        $stmt->execute();
        $students = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (empty($students)) {
            Response::error('Bu sınıfa kayıtlı öğrenci bulunamadı. Sınav oluşturulamaz.', 400);
            return;
        }

        // 2. Sınavı Kaydet
        $examId = $this->examModel->create(
            $data['class_id'],
            $data['exam_name'],
            $data['classroom'],
            $data['exam_date'],
            $data['exam_time']
        );

        if (!$examId) {
            Response::serverError('Sınav veritabanına kaydedilemedi.');
            return;
        }

        // 3. RASTGELE DAĞITIM ALGORİTMASI
        shuffle($students); // Öğrenci listesini karıştır
        
        $seatingArrangement = [];
        $seatCount = 60; // Sınıf kapasitesi
        
        foreach ($students as $index => $student) {
            if ($index >= $seatCount) break; // Yer kalmadıysa dur
            
            $seatingArrangement[] = [
                'student_id' => $student['id'],
                'seat_number' => $index + 1
            ];
        }

        // 4. Oturma Düzenini Kaydet
        $this->examModel->saveSeating($examId, $seatingArrangement);

        Response::success(['exam_id' => $examId], 'Sınav ve oturma düzeni başarıyla oluşturuldu.', 201);
    }

    // Sınav Detayı
    public function show($id) {
        $data = $this->examModel->getDetails($id);
        if ($data) {
            Response::success($data);
        } else {
            Response::notFound('Sınav bulunamadı.');
        }
    }

    public function delete($id) {
        if ($this->examModel->delete($id)) {
            Response::success(null, 'Sınav silindi.');
        } else {
            Response::serverError('Sınav silinemedi.');
        }
    }
}
?>
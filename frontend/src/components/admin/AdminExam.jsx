import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { FiPlus, FiTrash2, FiEye, FiClock, FiCalendar, FiDownload } from 'react-icons/fi';
import './AdminHome.css';

const AdminExam = () => {
  const [exams, setExams] = useState([]);
  const [showPast, setShowPast] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  // Form States
  const [classes, setClasses] = useState([]);
  const [formData, setFormData] = useState({
    class_id: '',
    exam_name: '',
    classroom: 'Derslik-1',
    exam_date: '',
    exam_time: ''
  });

  // Detay Görüntüleme State
  const [selectedExam, setSelectedExam] = useState(null);

  // Derslik Listesi
  const classrooms = Array.from({ length: 10 }, (_, i) => `Derslik-${i + 1}`);

  useEffect(() => {
    fetchExams();
    fetchClasses();
  }, [showPast]);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getExams(showPast);
      setExams(res.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await adminAPI.getClasses();
      setClasses(res.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.createExam(formData);
      setShowModal(false);
      fetchExams();
      alert('Sınav ve oturma düzeni başarıyla oluşturuldu!');
    } catch (error) {
      alert('Hata: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bu sınavı silmek istediğine emin misin?')) {
      try {
        await adminAPI.deleteExam(id);
        fetchExams();
      } catch (error) {
        console.error(error);
      }
    }
  };

  const openDetail = async (id) => {
    try {
      // API'den detayları çekiyoruz
      const res = await adminAPI.getExamDetails(id);
      setSelectedExam(res.data);
      setShowDetailModal(true); // Modalı açıyoruz
    } catch (error) {
      console.error(error);
      alert("Sınav detayları yüklenemedi.");
    }
  };

  // 60 Kişilik Sınıf Grid'i (Görsel Simülasyon)
  const renderSeatingChart = (seatingData) => {
    // 60 koltuklu boş array oluştur
    const seats = Array.from({ length: 60 }, (_, i) => i + 1);
    
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(6, 1fr)', // 6 Sütun
        gap: '10px',
        marginTop: '20px',
        backgroundColor: '#1a1a1a',
        padding: '20px',
        borderRadius: '8px'
      }}>
        <div style={{ gridColumn: 'span 6', textAlign: 'center', color: '#fff', marginBottom: '10px', borderBottom: '2px solid #555', paddingBottom: '10px' }}>
          <h3>TAHTA / KÜRSÜ ({selectedExam?.exam?.classroom})</h3>
        </div>
        {seats.map(seatNum => {
          // Bu koltukta oturan var mı?
          const student = seatingData?.find(s => parseInt(s.seat_number) === seatNum);
          
          return (
            <div key={seatNum} style={{
              height: '60px',
              backgroundColor: student ? 'rgba(0, 255, 157, 0.1)' : '#27272a', // Doluysa Yeşil tonu, boşsa gri
              border: student ? '1px solid #00ff9d' : '1px solid #444',
              borderRadius: '4px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              color: '#fff',
              position: 'relative'
            }}>
              <span style={{position: 'absolute', top: 2, left: 2, opacity: 0.5, fontSize:'8px'}}>{seatNum}</span>
              {student ? (
                <>
                  <span style={{fontWeight:'bold', color:'var(--ai-cyan)'}}>{student.first_name} {student.last_name?.charAt(0)}.</span>
                  <span style={{fontSize:'9px', color:'#aaa'}}>{student.student_number}</span>
                </>
              ) : (
                <span style={{color: '#444'}}>Boş</span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="admin-page-container">
      <div className="admin-header">
        <h1>Sınav Yönetimi</h1>
        <div className="flex gap-2">
          <button 
            className={`btn ${showPast ? 'btn-secondary' : 'btn-primary'}`}
            onClick={() => setShowPast(!showPast)}
          >
            {showPast ? 'Aktif Sınavları Göster' : 'Geçmiş Sınavları Göster'}
          </button>
          <button className="btn btn-success" onClick={() => setShowModal(true)}>
            <FiPlus /> Yeni Sınav Ekle
          </button>
        </div>
      </div>

      <div className="table-container card">
        <table>
          <thead>
            <tr>
              <th>Ders</th>
              <th>Sınav Adı</th>
              <th>Derslik</th>
              <th>Tarih / Saat</th>
              <th>Öğrenci Sayısı</th>
              <th>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan="6" className="text-center">Yükleniyor...</td></tr> : 
             exams.map(exam => (
              <tr key={exam.id}>
                <td style={{color: 'var(--ai-cyan)'}}>{exam.class_name} <small>({exam.class_code})</small></td>
                <td>{exam.exam_name}</td>
                <td>{exam.classroom}</td>
                <td>
                  <div className="flex flex-col">
                    <span className="flex items-center gap-2"><FiCalendar/> {exam.exam_date}</span>
                    <span className="flex items-center gap-2 text-muted"><FiClock/> {exam.exam_time}</span>
                  </div>
                </td>
                <td>{exam.student_count} / 60</td>
                <td>
                  <button className="btn btn-outline" onClick={() => openDetail(exam.id)} title="Oturma Düzeni">
                    <FiEye />
                  </button>
                  <button className="btn btn-danger ml-2" onClick={() => handleDelete(exam.id)}>
                    <FiTrash2 />
                  </button>
                </td>
              </tr>
            ))}
            {exams.length === 0 && !loading && 
              <tr><td colSpan="6" className="text-center">Kayıt bulunamadı.</td></tr>
            }
          </tbody>
        </table>
      </div>

      {/* SINAV EKLEME MODALI */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Sınav Planla & Oturma Düzeni Oluştur</h2>
            <form onSubmit={handleCreate}>
              {/* ... Form Alanları (Aynı) ... */}
              <div className="input-group">
                <label>Ders Seçimi</label>
                <select 
                  required 
                  onChange={(e) => setFormData({...formData, class_id: e.target.value})}
                >
                  <option value="">Ders Seçiniz...</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.class_name} ({c.class_code})</option>
                  ))}
                </select>
              </div>
              
              <div className="input-group">
                <label>Sınav Adı</label>
                <input 
                  type="text" required placeholder="Vize, Final..."
                  onChange={(e) => setFormData({...formData, exam_name: e.target.value})}
                />
              </div>

              <div className="input-group">
                <label>Derslik</label>
                <select 
                  onChange={(e) => setFormData({...formData, classroom: e.target.value})}
                  value={formData.classroom}
                >
                  {classrooms.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="flex gap-2">
                <div className="input-group w-full">
                  <label>Tarih</label>
                  <input type="date" required onChange={(e) => setFormData({...formData, exam_date: e.target.value})} />
                </div>
                <div className="input-group w-full">
                  <label>Saat</label>
                  <input type="time" required onChange={(e) => setFormData({...formData, exam_time: e.target.value})} />
                </div>
              </div>

              <div className="modal-actions mt-3">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>İptal</button>
                <button type="submit" className="btn btn-primary">Rastgele Dağıt ve Oluştur</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DETAY MODALI (OTURMA DÜZENİ) --- */}
      {showDetailModal && selectedExam && (
        <div className="modal-overlay">
          <div className="modal-content" style={{maxWidth: '1000px', width: '95%', maxHeight: '90vh', overflowY: 'auto'}}>
            <div className="flex justify-between items-center mb-3">
              <div>
                <h2 style={{color: 'var(--ai-cyan)'}}>{selectedExam.exam.exam_name}</h2>
                <p className="text-muted">{selectedExam.exam.class_name} - {selectedExam.exam.classroom}</p>
                <p className="text-muted"><FiCalendar/> {selectedExam.exam.exam_date} | <FiClock/> {selectedExam.exam.exam_time}</p>
              </div>
              <button className="btn btn-secondary" onClick={() => setShowDetailModal(false)}>Kapat</button>
            </div>
            
            {/* GERÇEK OTURMA DÜZENİ SİMÜLASYONU */}
            {renderSeatingChart(selectedExam.seating)}
            
            <div className="mt-3 text-right">
              <button className="btn btn-primary" onClick={() => window.print()}>
                <FiDownload /> Listeyi Yazdır
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminExam;
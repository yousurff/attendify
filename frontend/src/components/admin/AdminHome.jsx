import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import Header from '../common/Header';
import Button from '../common/Button';
import { 
  FiUsers, FiCalendar, FiBarChart2, FiCpu, 
  FiMessageSquare, FiClock, FiX, FiCheck, 
  FiBook, FiUserCheck, FiActivity, FiLayers, FiZap
} from 'react-icons/fi';
import './AdminHome.css';

// Takvim Sabitleri
const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
const HOURS = [
  '09:00-09:45', '09:55-10:40', '10:50-11:35', '11:45-12:30', 
  '12:40-13:25', '13:35-14:20', '14:30-15:15', '15:25-16:10', 
  '16:20-17:05', '17:15-18:00', '18:00-19:00'
];

const AdminHome = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    daily_logins: 0,
    weekly_logins: 0,
    monthly_logins: 0,
    monthly_ai_usage: 0
  });
  
  // Detaylı İstatistikler
  const [systemData, setSystemData] = useState({
    studentCount: 0,
    teacherCount: 0,
    classCount: 0,
    totalUsers: 0,
    totalFeedbacks: 0
  });

  const [allClasses, setAllClasses] = useState([]); // Tüm dersler
  const [feedbacks, setFeedbacks] = useState([]);
  const [error, setError] = useState('');
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [activeFilter, setActiveFilter] = useState('unread');

  // --- YARDIMCI: Geri Sayım Hesaplama (7 Gün Kuralı) ---
  const getRemainingTime = (createdAt) => {
    if (!createdAt) return null;
    const created = new Date(createdAt).getTime();
    const expiry = created + (7 * 24 * 60 * 60 * 1000); // 7 Gün ekle
    const now = Date.now();
    const diff = expiry - now;

    if (diff <= 0) return "Süresi Doldu";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    return `${days}g ${hours}s kaldı`;
  };

  // --- VERİ ÇEKME ---
  const fetchDashboard = async () => {
    try {
      const res = await adminAPI.getDashboard();
      if (res && res.data) {
        setStats(res.data.statistics || {});
        if (activeFilter === 'unread') {
          setFeedbacks(res.data.feedbacks || []);
        }
      }
    } catch (e) {
      console.error(e);
      setError('Dashboard verileri yüklenemedi');
    }
  };

  const fetchSystemData = async () => {
    try {
      const [studentsRes, teachersRes, classesRes] = await Promise.all([
        adminAPI.getStudents(),
        adminAPI.getTeachers(),
        adminAPI.getClasses()
      ]);

      const sCount = Array.isArray(studentsRes.data) ? studentsRes.data.length : 0;
      const tCount = Array.isArray(teachersRes.data) ? teachersRes.data.length : 0;
      
      const cData = Array.isArray(classesRes.data) ? classesRes.data : [];
      setAllClasses(cData); 

      setSystemData({
        studentCount: sCount,
        teacherCount: tCount,
        classCount: cData.length,
        totalUsers: sCount + tCount,
        totalFeedbacks: feedbacks.length 
      });
    } catch (error) {
      console.error('Sistem verileri alınamadı:', error);
    }
  };

  const initData = async () => {
    setLoading(true);
    await Promise.all([fetchDashboard(), fetchSystemData()]);
    setLoading(false);
  };

  useEffect(() => {
    initData();
  }, []);

  const handleFilterChange = async (filterType) => {
    setActiveFilter(filterType);
    setLoading(true);
    try {
      if (filterType === 'month') {
        const res = await adminAPI.getRecentFeedbacks();
        setFeedbacks(res.data || []);
      } else {
        await fetchDashboard(); 
      }
    } catch (error) {
      console.error("Filtre hatası:", error);
    } finally {
      setLoading(false);
    }
  };

  const markRead = async (id, e) => {
    if(e) e.stopPropagation();
    try {
      await adminAPI.markFeedbackRead(id);
      if (activeFilter === 'unread') {
         setFeedbacks(prev => prev.filter(f => f.id !== id));
         setSelectedFeedback(null);
      } else {
         setFeedbacks(prev => prev.map(f => {
             if (f.id === id) return { ...f, is_read: 1 };
             return f;
         }));
         if (selectedFeedback && selectedFeedback.id === id) {
             setSelectedFeedback(prev => ({ ...prev, is_read: 1 }));
         }
      }
    } catch (error) {
      alert('İşlem başarısız');
    }
  };

  const formatDate = (dateString) => {
    const options = { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('tr-TR', options);
  };

  // --- GENEL DERS PROGRAMI HESAPLAMA ---
  const renderMasterSchedule = () => {
    const scheduleMap = {};
    DAYS.forEach(day => {
        scheduleMap[day] = {};
        HOURS.forEach(hour => {
            scheduleMap[day][hour] = [];
        });
    });

    allClasses.forEach(cls => {
        if (cls.schedule) {
            try {
                const prog = typeof cls.schedule === 'string' ? JSON.parse(cls.schedule) : cls.schedule;
                if (Array.isArray(prog)) {
                    const teacherNames = cls.teachers && cls.teachers.length > 0 
                        ? cls.teachers.map(t => t.full_name).join(', ') 
                        : 'Atanmamış';

                    prog.forEach(slot => {
                        if (scheduleMap[slot.day] && scheduleMap[slot.day][slot.hour]) {
                            scheduleMap[slot.day][slot.hour].push({
                                className: cls.class_name,
                                classCode: cls.class_code,
                                teachers: teacherNames,
                                type: slot.type, // Make-up kontrolü için
                                created_at: slot.created_at // Sayaç için
                            });
                        }
                    });
                }
            } catch (e) { console.error("Parse error", e); }
        }
    });

    return (
        <div className="master-calendar-wrapper">
            <div className="master-calendar-grid">
                <div className="calendar-header-cell empty"></div>
                
                {DAYS.map(day => (
                    <div key={day} className="calendar-header-cell day-header">
                        {day}
                    </div>
                ))}

                {HOURS.map(hour => (
                    <React.Fragment key={hour}>
                        <div className="calendar-time-cell">{hour}</div>
                        {DAYS.map(day => {
                            const items = scheduleMap[day][hour];
                            const isConflict = items.length > 1;
                            
                            return (
                                <div key={`${day}-${hour}`} className={`calendar-cell ${items.length > 0 ? 'filled' : ''} ${isConflict ? 'conflict' : ''}`}>
                                    {items.map((item, idx) => {
                                        const isMakeup = item.type === 'makeup';
                                        const remaining = isMakeup ? getRemainingTime(item.created_at) : null;
                                        
                                        // Make-up ise DOLU MOR stil
                                        const customStyle = isMakeup ? {
                                            backgroundColor: 'rgba(126, 34, 206, 0.9)', // Daha koyu ve belirgin mor iç dolgu
                                            border: '1px solid #d8b4fe', // Açık mor kenarlık
                                            borderLeft: '3px solid #e9d5ff',
                                            boxShadow: '0 0 8px rgba(168, 85, 247, 0.4)' // Hafif neon parlama
                                        } : {};

                                        // Make-up ise yazı rengini daha parlak yap
                                        const titleStyle = isMakeup ? { color: '#fff', fontWeight:'bold' } : {};
                                        const codeStyle = isMakeup ? { color: '#e9d5ff' } : {};

                                        return (
                                            <div key={idx} className="calendar-item" style={customStyle}>
                                                <div className="cal-course-code" style={codeStyle}>{item.classCode}</div>
                                                <div className="cal-course-name" style={titleStyle}>{item.className}</div>
                                                <div className="cal-teacher" style={isMakeup ? {color:'#ddd'} : {}}>{item.teachers}</div>
                                                
                                                {/* Make-up Sayaç */}
                                                {isMakeup && remaining && (
                                                    <div style={{
                                                        marginTop:'5px', fontSize:'0.75em', 
                                                        color:'#fff', display:'flex', alignItems:'center', gap:'4px',
                                                        backgroundColor: 'rgba(0,0,0,0.4)', padding:'3px 6px', borderRadius:'4px',
                                                        fontWeight: 'bold', border: '1px solid rgba(255,255,255,0.2)'
                                                    }}>
                                                        <FiZap size={10} color="#fcd34d"/> {remaining}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
  };

  if (loading) return <div><Header title="Anasayfa" /><div className="spinner">Yükleniyor...</div></div>;

  return (
    <div>
      <Header title="Anasayfa" />
      {error && <div className="alert alert-danger">{error}</div>}

      {/* ÜST KARTLAR */}
      <div className="dashboard-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(3, 201, 248, 0.1)', color: 'var(--ai-blue)' }}><FiUsers /></div>
          <div className="stat-content"><h3>Günlük Giriş</h3><div className="stat-value">{stats.daily_logins || 0}</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(3, 201, 248, 0.1)', color: 'var(--ai-blue)' }}><FiCalendar /></div>
          <div className="stat-content"><h3>Haftalık Giriş</h3><div className="stat-value">{stats.weekly_logins || 0}</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(3, 201, 248, 0.1)', color: 'var(--ai-blue)' }}><FiBarChart2 /></div>
          <div className="stat-content"><h3>Aylık Giriş</h3><div className="stat-value">{stats.monthly_logins || 0}</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(3, 201, 248, 0.1)', color: 'var(--ai-blue)' }}><FiCpu /></div>
          <div className="stat-content"><h3>AI Kullanım</h3><div className="stat-value">{stats.monthly_ai_usage || 0}</div></div>
        </div>
      </div>

      <div className="dashboard-row">
        
        {/* SOL: GERİ BİLDİRİMLER */}
        <div className="card feedback-card">
          <div className="card-header-flex">
            <h3 className="card-title">Gelen Geri Bildirimler</h3>
            <div className="filter-buttons">
               <button className={`filter-btn ${activeFilter === 'unread' ? 'active' : ''}`} onClick={() => handleFilterChange('unread')}>Okunmamışlar</button>
               <button className={`filter-btn ${activeFilter === 'month' ? 'active' : ''}`} onClick={() => handleFilterChange('month')}>Son 1 Ay</button>
            </div>
          </div>
          <div className="feedback-list-container">
            {feedbacks.length === 0 ? (
              <div className="no-data">{activeFilter === 'unread' ? 'Yeni geri bildirim yok.' : 'Son 1 ayda geri bildirim bulunamadı.'}</div>
            ) : (
              feedbacks.map(f => (
                <div key={f.id} className="feedback-list-item" onClick={() => setSelectedFeedback(f)} style={{ opacity: f.is_read == 1 ? 0.6 : 1 }}>
                  <div className="feedback-icon" style={{ backgroundColor: f.is_read == 1 ? '#1e293b' : 'rgba(3, 201, 248, 0.1)', color: f.is_read == 1 ? '#94a3b8' : 'var(--ai-blue)' }}>
                    {f.is_read == 1 ? <FiCheck /> : <FiMessageSquare />}
                  </div>
                  <div className="feedback-info">
                    <div className="feedback-subject-line">{f.subject}</div>
                    <div className="feedback-meta">
                      <span className="feedback-sender">{f.teacher_name}</span>
                      <span className="feedback-dot">•</span>
                      <span className="feedback-date">{formatDate(f.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* SAĞ: KULLANICI & SİSTEM ÖZETİ */}
        <div className="card chart-card">
          <h3 className="card-title" style={{marginBottom:'25px'}}>Sistem Özeti</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            
            <div style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
              padding: '15px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px',
              borderLeft: '4px solid var(--ai-blue)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ padding: '10px', borderRadius: '50%', backgroundColor: 'rgba(3, 201, 248, 0.1)', color: 'var(--ai-blue)' }}>
                  <FiUsers size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.9em', color: '#cbd5e1' }}>Kayıtlı Öğrenci</div>
                  <div style={{ fontSize: '1.2em', fontWeight: 'bold', color: '#fff' }}>{systemData.studentCount}</div>
                </div>
              </div>
            </div>

            <div style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
              padding: '15px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px',
              borderLeft: '4px solid #ff0080'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ padding: '10px', borderRadius: '50%', backgroundColor: 'rgba(255, 0, 128, 0.1)', color: '#ff0080' }}>
                  <FiUserCheck size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.9em', color: '#cbd5e1' }}>Kayıtlı Öğretmen</div>
                  <div style={{ fontSize: '1.2em', fontWeight: 'bold', color: '#fff' }}>{systemData.teacherCount}</div>
                </div>
              </div>
            </div>

            <div style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
              padding: '15px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px',
              borderLeft: '4px solid #10b981'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ padding: '10px', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                  <FiBook size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.9em', color: '#cbd5e1' }}>Açılan Dersler</div>
                  <div style={{ fontSize: '1.2em', fontWeight: 'bold', color: '#fff' }}>{systemData.classCount}</div>
                </div>
              </div>
            </div>

            <div style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
              padding: '15px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px',
              borderLeft: '4px solid #f59e0b'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ padding: '10px', borderRadius: '50%', backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                  <FiActivity size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.9em', color: '#cbd5e1' }}>Sistem Durumu</div>
                  <div style={{ fontSize: '1.1em', fontWeight: 'bold', color: '#10b981' }}>Çevrimiçi</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* --- GENEL DERS PROGRAMI --- */}
      <div className="card" style={{marginTop: '30px', overflowX: 'auto'}}>
        <div className="card-header-flex">
            <h3 className="card-title" style={{display:'flex', alignItems:'center', gap:'10px'}}>
                <FiLayers /> Genel Ders Programı (Master Schedule)
            </h3>
        </div>
        {renderMasterSchedule()}
      </div>

      {/* MODAL KODLARI */}
      {selectedFeedback && (
        <div className="modal-overlay" onClick={() => setSelectedFeedback(null)}>
          <div className="modal-content feedback-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Geri Bildirim Detayı</h2>
              <button className="close-btn" onClick={() => setSelectedFeedback(null)}><FiX size={24} /></button>
            </div>
            <div className="modal-body">
              <div className="detail-row">
                <label><FiUsers className="icon"/> Gönderen:</label>
                <div className="detail-value"><strong>{selectedFeedback.teacher_name}</strong> <span className="detail-email">({selectedFeedback.teacher_email})</span></div>
              </div>
              <div className="detail-row">
                <label><FiClock className="icon"/> Tarih:</label>
                <div className="detail-value">{formatDate(selectedFeedback.created_at)}</div>
              </div>
              <div className="detail-row">
                <label><FiMessageSquare className="icon"/> Konu:</label>
                <div className="detail-value highlight">{selectedFeedback.subject}</div>
              </div>
              <div className="message-box">
                <label>Mesaj İçeriği:</label>
                <p>{selectedFeedback.message}</p>
              </div>
            </div>
            <div className="modal-footer">
              {selectedFeedback.is_read == 0 ? (
                  <Button variant="primary" onClick={(e) => markRead(selectedFeedback.id, e)}>Okundu Olarak İşaretle</Button>
              ) : (
                  <div style={{color:'#10b981', display:'flex', alignItems:'center', gap:'5px', marginRight:'auto'}}><FiCheck /> Bu mesaj okundu</div>
              )}
              <Button variant="outline" onClick={() => setSelectedFeedback(null)}>Kapat</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminHome;
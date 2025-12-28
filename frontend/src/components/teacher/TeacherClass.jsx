import React, { useState, useEffect } from 'react';
import { teacherAPI } from '../../services/api';
import Header from '../common/Header';
import { FiBook, FiUsers, FiCalendar, FiClock, FiZap } from 'react-icons/fi'; // FiZap eklendi

// Takvim Sabitleri
const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
const HOURS = [
  '09:00-09:45', '09:55-10:40', '10:50-11:35', '11:45-12:30', 
  '12:40-13:25', '13:35-14:20', '14:30-15:15', '15:25-16:10', 
  '16:20-17:05', '17:15-18:00', '18:00-19:00'
];

const TeacherClass = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const response = await teacherAPI.getMyClasses();
      setClasses(response.data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- YARDIMCI: Geri Sayım Hesaplama (7 Gün Kuralı) ---
  const getRemainingTime = (createdAt) => {
    if (!createdAt) return null;
    const created = new Date(createdAt).getTime();
    const expiry = created + (7 * 24 * 60 * 60 * 1000); // 7 Gün ekle
    const now = Date.now();
    const diff = expiry - now;

    if (diff <= 0) return "Süre Doldu";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    // Alan dar olduğu için kısa format: "6g 2s"
    return `${days}g ${hours}s`;
  };

  // Dersin programını parse edip basit bir diziye çeviren yardımcı fonksiyon
  const parseSchedule = (scheduleData) => {
    if (!scheduleData) return [];
    try {
      const parsed = typeof scheduleData === 'string' ? JSON.parse(scheduleData) : scheduleData;
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  };

  // Her bir ders kartı için Takvim Render Fonksiyonu
  const renderClassSchedule = (scheduleData) => {
    const schedule = parseSchedule(scheduleData);

    return (
      <div style={{marginTop: '15px', overflowX: 'auto'}}>
        <div style={{
          display: 'grid',
          // Sol sütun (saatler) + 7 gün. Min genişlik arttırıldı (metin sığsın diye)
          gridTemplateColumns: `80px repeat(${DAYS.length}, minmax(55px, 1fr))`,
          gap: '3px',
          fontSize: '0.7rem',
          minWidth: '500px' 
        }}>
          {/* Başlıklar (Günler) */}
          <div style={{}}></div> {/* Saat sütunu başlığı boş */}
          {DAYS.map(day => (
            <div key={day} style={{
              textAlign: 'center', color: '#94a3b8', fontWeight: 'bold', 
              padding: '4px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '4px'
            }}>
              {day.substring(0, 3)}
            </div>
          ))}

          {/* Saatler ve Hücreler */}
          {HOURS.map(hour => {
             // Saatin sadece başlangıcını gösterelim (yer kazanmak için)
             const shortHour = hour.split('-')[0]; 
             return (
              <React.Fragment key={hour}>
                {/* Saat Sütunu */}
                <div style={{
                  color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', 
                  paddingRight: '8px', fontSize: '0.75em', fontWeight:'600'
                }}>
                  {shortHour}
                </div>

                {/* Gün Hücreleri */}
                {DAYS.map(day => {
                  // Bu gün ve saatte ders var mı?
                  const activeSlot = schedule.find(s => s.day === day && s.hour === hour);
                  
                  // Make-up kontrolü
                  const isMakeup = activeSlot?.type === 'makeup';
                  const remaining = isMakeup ? getRemainingTime(activeSlot.created_at) : null;

                  // Stil Ayarları
                  let bg = 'rgba(255,255,255,0.03)';
                  let border = '1px solid rgba(255,255,255,0.05)';
                  let shadow = 'none';
                  
                  if (activeSlot) {
                      if (isMakeup) {
                          bg = 'rgba(168, 85, 247, 0.25)'; // Mor
                          border = '1px solid #a855f7';
                          shadow = '0 0 8px rgba(168, 85, 247, 0.3)';
                      } else {
                          bg = 'var(--ai-blue)'; // Mavi
                          border = '1px solid var(--ai-cyan)';
                          shadow = '0 0 5px rgba(3, 201, 248, 0.4)';
                      }
                  }

                  return (
                    <div key={`${day}-${hour}`} style={{
                      backgroundColor: bg,
                      border: border,
                      borderRadius: '4px',
                      height: '35px', // Yükseklik arttırıldı (yazı için)
                      boxShadow: shadow,
                      display: 'flex', flexDirection: 'column', 
                      alignItems: 'center', justifyContent: 'center',
                      color: isMakeup ? '#e9d5ff' : 'transparent',
                      transition: 'all 0.2s'
                    }} title={activeSlot ? `${day} ${hour} ${isMakeup ? '(Telafi)' : ''}` : ''}>
                        {/* Make-up ise ikon ve süre göster */}
                        {isMakeup && (
                            <>
                                <FiZap size={10} />
                                <span style={{fontSize:'0.65em', fontWeight:'bold', lineHeight:1, marginTop:'2px'}}>
                                    {remaining}
                                </span>
                            </>
                        )}
                    </div>
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>
        
        {/* Lejant / Açıklama */}
        <div style={{display:'flex', alignItems:'center', gap:'15px', marginTop:'12px', fontSize:'0.8em', color:'#94a3b8', paddingLeft:'80px'}}>
            <div style={{display:'flex', alignItems:'center', gap:'6px'}}>
                <div style={{width:'12px', height:'12px', backgroundColor:'var(--ai-blue)', borderRadius:'3px', boxShadow:'0 0 5px rgba(3, 201, 248, 0.4)'}}></div>
                <span>Normal Ders</span>
            </div>
            <div style={{display:'flex', alignItems:'center', gap:'6px'}}>
                <div style={{width:'12px', height:'12px', backgroundColor:'rgba(168, 85, 247, 0.5)', border:'1px solid #a855f7', borderRadius:'3px', boxShadow:'0 0 5px rgba(168, 85, 247, 0.4)'}}></div>
                <span>Telafi (Make-up)</span>
            </div>
        </div>
      </div>
    );
  };

  if (loading) return <div><Header title="Sınıflarım" /><div className="spinner">Yükleniyor...</div></div>;

  return (
    <div>
      <Header title="Sınıflarım" />
      
      {/* Grid Container */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', 
        gap: '30px',
        marginTop: '30px'
      }}>
        {classes.length === 0 ? (
          <div style={{gridColumn: '1 / -1', textAlign: 'center', color: '#cbd5e1', padding: '40px', fontStyle: 'italic', backgroundColor: 'var(--ai-dark)', borderRadius: '12px', border: '1px solid var(--ai-mid)'}}>
            Henüz atanmış bir sınıfınız bulunmamaktadır.
          </div>
        ) : (
          classes.map((cls) => (
            <div key={cls.id} className="card" style={{margin: 0, height: '100%', display:'flex', flexDirection:'column'}}>
              
              {/* Kart Başlığı */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                borderBottom: '1px solid var(--ai-mid)', paddingBottom: '15px', marginBottom: '15px'
              }}>
                <div>
                  <h3 style={{margin: 0, color: 'var(--ai-cyan)', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px'}}>
                    <FiBook /> {cls.class_name}
                  </h3>
                  <div style={{color: '#94a3b8', fontSize: '0.9rem', marginTop: '5px', marginLeft: '28px'}}>
                    Ders Kodu: <strong style={{color: '#fff'}}>{cls.class_code}</strong>
                  </div>
                </div>
                <div style={{
                  backgroundColor: 'rgba(255, 0, 128, 0.1)', color: '#ff0080', 
                  padding: '5px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold',
                  display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid rgba(255, 0, 128, 0.3)'
                }}>
                  <FiUsers /> {cls.students ? cls.students.length : 0} Öğrenci
                </div>
              </div>

              {/* Takvim Bölümü */}
              <div style={{flex: 1}}>
                <h4 style={{
                    fontSize: '0.95rem', color: '#fff', marginBottom: '10px', 
                    display: 'flex', alignItems: 'center', gap: '8px'
                }}>
                    <FiCalendar style={{color: 'var(--ai-blue)'}} /> Haftalık Ders Programı
                </h4>
                <div style={{
                    backgroundColor: 'rgba(0,0,0,0.3)', 
                    padding: '15px', 
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.05)'
                }}>
                    {renderClassSchedule(cls.schedule)}
                </div>
              </div>

            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TeacherClass;
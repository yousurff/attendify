import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { FiPlus, FiEdit, FiTrash2, FiChevronDown, FiChevronRight, FiUsers, FiUser, FiClock, FiCheck, FiCalendar, FiSearch, FiZap } from 'react-icons/fi';
import Header from '../common/Header';
import Button from '../common/Button';

// Günler ve Saatler
const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

const HOURS = [
  '09:00-09:45',
  '09:55-10:40',
  '10:50-11:35',
  '11:45-12:30',
  '12:40-13:25',
  '13:35-14:20',
  '14:30-15:15',
  '15:25-16:10',
  '16:20-17:05',
  '17:15-18:00',
  '18:00-19:00'
];

const AdminClass = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Normal Modal State'leri
  const [showModal, setShowModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [expandedClassId, setExpandedClassId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Make-up (Telafi) Modal State'leri
  const [showMakeupModal, setShowMakeupModal] = useState(false);
  const [selectedMakeupClassIds, setSelectedMakeupClassIds] = useState([]); 
  // DEĞİŞİKLİK: Artık tek slot değil, birden fazla slot tutuyoruz (Array)
  const [makeupSlots, setMakeupSlots] = useState([]); 

  const [formData, setFormData] = useState({
    class_name: '',
    class_code: '',
    description: '',
    max_absences: 3,
    schedule: [] 
  });

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getClasses();
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

    if (diff <= 0) return "Süresi Doldu";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    return `${days}g ${hours}s kaldı`;
  };

  // --- FİLTRELEME ---
  const filteredClasses = classes.filter((cls) => {
    const term = searchTerm.toLowerCase();
    const className = cls.class_name ? cls.class_name.toLowerCase() : '';
    const classCode = cls.class_code ? cls.class_code.toLowerCase() : '';
    return className.includes(term) || classCode.includes(term);
  });

  const toggleRow = (id) => {
    setExpandedClassId(expandedClassId === id ? null : id);
  };

  // --- CRUD İŞLEMLERİ ---
  const handleEdit = (cls) => {
    setSelectedClass(cls);
    const rawSchedule = cls.weekly_schedule || cls.schedule;
    let parsedSchedule = [];
    try {
      if (typeof rawSchedule === 'string') {
        parsedSchedule = JSON.parse(rawSchedule);
      } else if (Array.isArray(rawSchedule)) {
        parsedSchedule = rawSchedule;
      }
    } catch (e) { parsedSchedule = []; }

    setFormData({
      class_name: cls.class_name,
      class_code: cls.class_code,
      description: cls.description || '',
      max_absences: cls.max_absences,
      schedule: parsedSchedule
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bu dersi silmek istediğinize emin misiniz?')) {
      try {
        await adminAPI.deleteClass(id);
        fetchClasses();
      } catch (error) { alert('Silme başarısız'); }
    }
  };

  // --- PROGRAM SLOTU SEÇİMİ (Normal Modal İçin) ---
  const toggleScheduleSlot = (day, hour) => {
    setFormData(prev => {
      const currentSchedule = Array.isArray(prev.schedule) ? prev.schedule : [];
      const exists = currentSchedule.find(s => s.day === day && s.hour === hour);
      let newSchedule;
      if (exists) {
        newSchedule = currentSchedule.filter(s => !(s.day === day && s.hour === hour));
      } else {
        newSchedule = [...currentSchedule, { day, hour }];
      }
      return { ...prev, schedule: newSchedule };
    });
  };

  // --- MAKE-UP (TELAFİ) İŞLEMLERİ ---
  const openMakeupModal = () => {
    setSelectedMakeupClassIds([]);
    setMakeupSlots([]); // Sıfırla
    setShowMakeupModal(true);
  };

  // Çoklu Sınıf Seçimi Toggle
  const toggleMakeupClassSelection = (classId) => {
    setSelectedMakeupClassIds(prev => {
        if (prev.includes(classId)) {
            // Seçimi kaldır
            return prev.filter(id => id !== classId);
        } else {
            // Seçime ekle, ancak takvim seçimini sıfırla (çünkü ortak boşluklar değişebilir)
            setMakeupSlots([]); 
            return [...prev, classId];
        }
    });
  };

  // DEĞİŞİKLİK: Çoklu Slot Seçimi Toggle
  const toggleMakeupSlotSelection = (day, hour) => {
    setMakeupSlots(prev => {
        const exists = prev.find(s => s.day === day && s.hour === hour);
        if (exists) {
            // Varsa çıkar
            return prev.filter(s => !(s.day === day && s.hour === hour));
        } else {
            // Yoksa ekle
            return [...prev, { day, hour }];
        }
    });
  };

  const handleMakeupSubmit = async () => {
    if (selectedMakeupClassIds.length === 0 || makeupSlots.length === 0) {
      alert('Lütfen en az bir sınıf ve en az bir ders saati seçiniz.');
      return;
    }

    try {
        // Seçilen her sınıf için işlemi uygula
        const promises = selectedMakeupClassIds.map(async (classId) => {
            const targetClass = classes.find(c => c.id === parseInt(classId));
            if (!targetClass) return;

            let currentSchedule = [];
            try {
                const raw = targetClass.weekly_schedule || targetClass.schedule;
                currentSchedule = typeof raw === 'string' ? JSON.parse(raw) : (Array.isArray(raw) ? raw : []);
            } catch (e) { currentSchedule = []; }

            // Seçilen tüm slotları ekle
            const newSlots = [];
            
            // Her bir seçilen saat için çakışma kontrolü ve ekleme
            for (const slot of makeupSlots) {
                const exists = currentSchedule.find(s => s.day === slot.day && s.hour === slot.hour);
                if (exists) {
                    throw new Error(`${targetClass.class_name} dersinde ${slot.day} ${slot.hour} saati dolu.`);
                }
                newSlots.push({
                    day: slot.day,
                    hour: slot.hour,
                    type: 'makeup',
                    created_at: new Date().toISOString()
                });
            }

            const updatedSchedule = [...currentSchedule, ...newSlots];

            return adminAPI.updateClass(targetClass.id, {
                ...targetClass,
                schedule: JSON.stringify(updatedSchedule)
            });
        });

        await Promise.all(promises);
        alert('Make-up dersleri başarıyla eklendi! (7 gün geçerli)');
        setShowMakeupModal(false);
        fetchClasses();

    } catch (error) {
        alert('Hata oluştu: ' + error.message);
    }
  };

  // --- FORM SUBMIT (Normal) ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        class_name: formData.class_name,
        class_code: formData.class_code,
        description: formData.description,
        max_absences: parseInt(formData.max_absences),
        schedule: JSON.stringify(formData.schedule) 
      };

      if (selectedClass) {
        await adminAPI.updateClass(selectedClass.id, payload);
        alert('Ders başarıyla güncellendi!');
      } else {
        await adminAPI.createClass(payload);
        alert('Ders başarıyla eklendi!');
      }
      setShowModal(false);
      fetchClasses();
    } catch (error) {
      alert('İşlem başarısız: ' + (error.response?.data?.message || error.message));
    }
  };

  // --- IZGARA RENDER (Hem Görüntüleme Hem Seçim İçin) ---
  const renderScheduleGrid = (scheduleData, mode = 'view') => {
    let combinedSchedule = [];

    if (mode === 'makeup') {
        // SEÇİLEN TÜM SINIFLARIN PROGRAMLARINI BİRLEŞTİR
        // Eğer herhangi bir sınıfta o saat doluysa, takvimde dolu göster.
        selectedMakeupClassIds.forEach(id => {
            const cls = classes.find(c => c.id === parseInt(id));
            if (cls) {
                let s = [];
                try {
                    const raw = cls.weekly_schedule || cls.schedule;
                    s = typeof raw === 'string' ? JSON.parse(raw) : (Array.isArray(raw) ? raw : []);
                } catch(e) {}
                combinedSchedule = [...combinedSchedule, ...s];
            }
        });
    } else {
        // Normal mod
        const rawData = scheduleData || [];
        if (Array.isArray(rawData)) {
            combinedSchedule = rawData;
        } else if (typeof rawData === 'string') {
            try { combinedSchedule = JSON.parse(rawData); } catch(e) {}
        }
    }

    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: `100px repeat(${DAYS.length}, 1fr)`,
        gap: '4px', marginTop: '10px', userSelect: 'none', fontSize: '0.75rem', overflowX: 'auto'
      }}>
        <div></div>
        {DAYS.map(day => (
          <div key={day} style={{textAlign:'center', color:'var(--ai-cyan)', fontWeight:'bold', paddingBottom:'5px'}}>
            {day.substring(0,3)}
          </div>
        ))}

        {HOURS.map(hour => (
          <React.Fragment key={hour}>
            <div style={{
              color:'#cbd5e1', display:'flex', alignItems:'center', justifyContent:'flex-end', 
              paddingRight:'8px', borderRight:'1px solid rgba(255,255,255,0.1)'
            }}>
              {hour}
            </div>
            {DAYS.map(day => {
              // Bu saatte ders var mı?
              const activeSlot = combinedSchedule.find(s => s.day === day && s.hour === hour);
              
              // DEĞİŞİKLİK: Çoklu slot kontrolü
              const isSelectedForMakeup = mode === 'makeup' && makeupSlots.some(s => s.day === day && s.hour === hour);
              
              // Renk ve Stil Ayarları
              let bg = 'rgba(255,255,255,0.03)';
              let border = '1px solid rgba(255,255,255,0.1)';
              let content = null;
              
              // 1. Eğer bir ders varsa (Dolu Slot)
              if (activeSlot) {
                if (activeSlot.type === 'makeup') {
                  bg = 'rgba(168, 85, 247, 0.2)'; 
                  border = '1px solid #a855f7';
                  const remaining = getRemainingTime(activeSlot.created_at);
                  content = (
                    <div style={{display:'flex', flexDirection:'column', alignItems:'center'}}>
                         <FiZap size={14} color="#d8b4fe" />
                         {remaining && <span style={{fontSize:'0.65em', color:'#d8b4fe', marginTop:'2px'}}>{remaining}</span>}
                    </div>
                  );
                } else {
                  bg = 'var(--ai-blue)';
                  content = <FiCheck size={14} color="#000" strokeWidth={3} />;
                }
              }

              // 2. Eğer Make-up Modunda Seçim Yapıldıysa
              if (isSelectedForMakeup) {
                 bg = '#a855f7'; // Parlak Mor
                 border = '1px solid #fff';
                 content = <FiCheck size={14} color="#fff" strokeWidth={3} />;
              }

              // Tıklama Olayı
              const handleClick = () => {
                if (mode === 'edit') toggleScheduleSlot(day, hour);
                if (mode === 'makeup') {
                    // Dolu değilse seçime izin ver (Toggle)
                    if (!activeSlot) toggleMakeupSlotSelection(day, hour);
                }
              };

              // Cursor Durumu
              const cursor = (mode === 'edit' || (mode === 'makeup' && !activeSlot)) ? 'pointer' : 'default';

              return (
                <div 
                  key={`${day}-${hour}`}
                  onClick={handleClick}
                  style={{
                    backgroundColor: bg,
                    border: border,
                    borderRadius: '4px', height: '34px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: cursor, transition: 'all 0.2s', position:'relative'
                  }}
                  title={activeSlot?.type === 'makeup' ? 'Telafi Dersi' : (activeSlot ? 'Dolu Ders Saati' : 'Müsait')}
                >
                  {content}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    );
  };

  if (loading) return <div><Header title="Sınıf Yönetimi" /><div className="spinner">Yükleniyor...</div></div>;

  return (
    <div>
      <Header title="Sınıf Yönetimi" />
      <div className="page-actions single" style={{display:'flex', gap:'15px'}}>
        <Button onClick={() => {
            setSelectedClass(null);
            setFormData({ class_name: '', class_code: '', description: '', max_absences: 3, schedule: [] });
            setShowModal(true);
        }} icon={<FiPlus />} variant="primary">Yeni Ders Ekle</Button>
        
        {/* --- MAKE-UP BUTTON (MOR) --- */}
        {/* DÜZELTME: className="btn-purple-force" eklendi */}
        <Button 
            onClick={openMakeupModal} 
            icon={<FiZap />} 
            className="btn-purple-force"
        >
            Make Up Ders Ekle
        </Button>
      </div>

      <div className="card">
        
        {/* ARAMA KUTUSU */}
        <div style={{ marginBottom: '20px', position: 'relative' }}>
          <div style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--ai-cyan)', fontSize: '18px' }}>
            <FiSearch />
          </div>
          <input
            type="text"
            placeholder="Ders Adı veya Kodu ile ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%', padding: '12px 15px 12px 45px', borderRadius: '8px',
              border: '1px solid var(--ai-mid)', backgroundColor: 'rgba(0,0,0,0.2)',
              color: '#fff', fontSize: '1rem', outline: 'none'
            }}
          />
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{width: '40px'}}></th><th>Ders Adı</th><th>Ders Kodu</th><th>Öğrenci Sayısı</th><th>Öğretmen Sayısı</th><th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filteredClasses.length === 0 ? (
                <tr><td colSpan="6" className="text-center" style={{padding:'20px', color:'#cbd5e1'}}>
                    {searchTerm ? 'Aradığınız kriterlere uygun ders bulunamadı.' : 'Henüz ders bulunmamaktadır.'}
                </td></tr>
              ) : (
                filteredClasses.map((cls) => (
                  <React.Fragment key={cls.id}>
                    <tr 
                      style={{cursor: 'pointer', backgroundColor: expandedClassId === cls.id ? 'var(--ai-darkest)' : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.1)'}}
                      onClick={() => toggleRow(cls.id)}
                    >
                      <td style={{textAlign: 'center', color: 'var(--ai-cyan)'}}>{expandedClassId === cls.id ? <FiChevronDown size={20} /> : <FiChevronRight size={20} />}</td>
                      <td style={{fontWeight: '500', color: '#fff'}}>{cls.class_name}</td>
                      <td style={{color: '#fff'}}>{cls.class_code}</td>
                      <td><span style={{backgroundColor: 'rgba(3, 201, 248, 0.1)', color: 'var(--ai-cyan)', border: '1px solid var(--ai-cyan)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.85em'}}>{cls.student_count || 0}</span></td>
                      <td style={{color: '#fff'}}>{cls.teacher_count || 0}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-2">
                          <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(cls)}><FiEdit /></button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(cls.id)}><FiTrash2 /></button>
                        </div>
                      </td>
                    </tr>

                    {/* DETAY SATIRI */}
                    {expandedClassId === cls.id && (
                      <tr style={{backgroundColor: 'var(--ai-darkest)'}}>
                        <td colSpan="6" style={{padding: '0'}}>
                          <div style={{
                            padding: '20px 40px', borderTop: 'none', borderBottom: '1px solid var(--ai-mid)', color: '#ffffff', 
                            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px'
                          }}>
                            {/* SOL KOLON: LİSTELER (Aynen kaldı) */}
                            <div>
                                <div style={{marginBottom: '20px'}}>
                                  <h4 style={{fontSize: '1rem', fontWeight: '600', color: 'var(--ai-cyan)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px'}}><FiUser /> Dersi Veren Öğretmenler</h4>
                                  {cls.teachers && cls.teachers.length > 0 ? (
                                    <div style={{display: 'flex', flexWrap: 'wrap', gap: '10px'}}>
                                        {cls.teachers.map(teacher => (
                                            <div key={teacher.id} style={{backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid var(--ai-mid)', color: '#ffffff', padding: '8px 12px', borderRadius: '6px', fontSize: '0.9em'}}>
                                                <strong>{teacher.full_name}</strong>
                                            </div>
                                        ))}
                                    </div>
                                  ) : (<div style={{color: '#cbd5e1', fontStyle: 'italic'}}>Henüz öğretmen atanmamış.</div>)}
                                </div>
                                
                                <div>
                                  <h4 style={{fontSize: '1rem', fontWeight: '600', color: 'var(--ai-cyan)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px'}}><FiUsers /> Dersi Alan Öğrenciler</h4>
                                  {cls.students && cls.students.length > 0 ? (
                                    <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px', maxHeight: '200px', overflowY: 'auto'}}>
                                      {cls.students.map(student => (
                                        <div key={student.id} style={{backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid var(--ai-mid)', color: '#ffffff', padding: '8px', borderRadius: '6px', fontSize: '0.9em', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                          <span>{student.first_name} {student.last_name}</span>
                                          <span style={{color: 'var(--ai-blue)', fontSize: '0.8em'}}>{student.student_number}</span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (<div style={{color: '#cbd5e1', fontStyle: 'italic'}}>Henüz öğrenci kayıtlı değil.</div>)}
                                </div>
                            </div>

                            {/* SAĞ KOLON: HAFTALIK DERS PROGRAMI (Görünüm Modu) */}
                            <div>
                                <h4 style={{fontSize: '1rem', fontWeight: '600', color: 'var(--ai-cyan)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px'}}><FiCalendar /> Haftalık Ders Programı</h4>
                                <div style={{backgroundColor: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)'}}>
                                  {/* Mode 'view' olarak çağrılır */}
                                  {renderScheduleGrid(cls.weekly_schedule || cls.schedule, 'view')}
                                </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MAKE-UP MODAL (YENİ - ÇOKLU SEÇİM) --- */}
      {showMakeupModal && (
        <div className="modal-overlay" onClick={() => setShowMakeupModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{maxWidth: '800px'}}>
             <h2 className="card-title" style={{color: '#a855f7 !important'}}>Make-up (Telafi) Dersi Ekle</h2>
             <div className="modal-body" style={{padding: '20px 0'}}>
                
                {/* 1. ÇOKLU SINIF SEÇİMİ */}
                <div className="input-group">
                    <label style={{color:'#fff', fontWeight:'bold', marginBottom:'10px', display:'block'}}>Telafi Yapılacak Sınıfları Seçiniz</label>
                    <div style={{
                        border: '1px solid var(--ai-mid)', 
                        padding: '10px', 
                        borderRadius: '8px', 
                        maxHeight: '150px', 
                        overflowY: 'auto', 
                        backgroundColor: 'var(--ai-darkest)',
                        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '8px'
                    }}>
                        {classes.map(c => (
                            <div key={c.id} 
                                onClick={() => toggleMakeupClassSelection(c.id)}
                                style={{
                                    padding: '8px', borderRadius:'6px', cursor:'pointer',
                                    display:'flex', alignItems:'center', gap:'10px',
                                    backgroundColor: selectedMakeupClassIds.includes(c.id) ? 'rgba(168, 85, 247, 0.2)' : 'transparent',
                                    border: selectedMakeupClassIds.includes(c.id) ? '1px solid #a855f7' : '1px solid transparent'
                                }}
                            >
                                <div style={{
                                    width:'18px', height:'18px', borderRadius:'4px', border:'2px solid #a855f7',
                                    display:'flex', alignItems:'center', justifyContent:'center',
                                    backgroundColor: selectedMakeupClassIds.includes(c.id) ? '#a855f7' : 'transparent'
                                }}>
                                    {selectedMakeupClassIds.includes(c.id) && <FiCheck size={12} color="#fff" />}
                                </div>
                                <span style={{color: selectedMakeupClassIds.includes(c.id) ? '#fff' : '#cbd5e1', fontSize:'0.9rem'}}>
                                    {c.class_name} <small style={{opacity:0.7}}>({c.class_code})</small>
                                </span>
                            </div>
                        ))}
                    </div>
                    {selectedMakeupClassIds.length === 0 && (
                        <div style={{fontSize:'0.8em', color:'#ef4444', marginTop:'5px'}}>* En az bir sınıf seçmelisiniz.</div>
                    )}
                </div>

                {/* 2. TAKVİM SEÇİMİ */}
                {selectedMakeupClassIds.length > 0 && (
                    <div style={{marginTop:'20px'}}>
                         <label style={{color:'#a855f7', fontWeight:'bold', display:'block', marginBottom:'10px'}}>Telafi Dersinin Saatini Seçiniz (Birden fazla seçilebilir):</label>
                         <div style={{fontSize:'0.85em', color:'#cbd5e1', marginBottom:'10px'}}>
                            Müsait kutucuklara tıklayarak seçimlerinizi yapın. (Seçilen sınıflardan <b>herhangi birinin</b> dolu olduğu saatler kapalıdır.)
                         </div>
                         <div style={{backgroundColor:'rgba(0,0,0,0.3)', padding:'10px', borderRadius:'8px', border:'1px solid #a855f7'}}>
                            {renderScheduleGrid(null, 'makeup')}
                         </div>
                         
                         {makeupSlots.length > 0 && (
                             <div style={{marginTop:'15px', color:'#a855f7', fontWeight:'bold', textAlign:'center', fontSize:'0.9em'}}>
                                 Seçilen Saatler: {makeupSlots.map(s => `${s.day} ${s.hour}`).join(', ')}
                             </div>
                         )}
                    </div>
                )}
             </div>

             <div className="flex gap-2 mt-4" style={{borderTop:'1px solid var(--ai-mid)', paddingTop:'20px', justifyContent:'flex-end'}}>
                {/* MODAL İÇİNDEKİ BUTON DA MOR YAPILDI */}
                <Button 
                    onClick={handleMakeupSubmit} 
                    className="btn-purple-force"
                >
                    Onayla ve Ekle
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowMakeupModal(false)}>İptal</Button>
             </div>
          </div>
        </div>
      )}

      {/* Normal Düzenleme Modalı */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{maxWidth: '900px'}}>
            <h2 className="card-title">{selectedClass ? 'Dersi Düzenle' : 'Yeni Ders Ekle'}</h2>
            <form onSubmit={handleSubmit}>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px'}}>
                <div>
                  <div className="input-group"><label>Ders Adı *</label><input type="text" name="class_name" value={formData.class_name} onChange={(e) => setFormData({...formData, class_name: e.target.value})} required /></div>
                  <div className="input-group"><label>Ders Kodu *</label><input type="text" name="class_code" value={formData.class_code} onChange={(e) => setFormData({...formData, class_code: e.target.value})} required /></div>
                  <div className="input-group"><label>Maksimum Devamsızlık</label><input type="number" name="max_absences" value={formData.max_absences} onChange={(e) => setFormData({...formData, max_absences: e.target.value})} min="1" /></div>
                  <div className="input-group"><label>Açıklama</label><textarea name="description" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows="3" /></div>
                </div>
                
                <div>
                  <label style={{color: 'var(--ai-cyan)', fontWeight: '600', marginBottom: '10px', display: 'block'}}><FiClock style={{marginRight:'5px', verticalAlign:'middle'}}/> Haftalık Ders Programı</label>
                  {/* Edit Modu */}
                  {renderScheduleGrid(formData.schedule, 'edit')}
                </div>
              </div>

              <div className="flex gap-2 mt-4" style={{borderTop:'1px solid var(--ai-mid)', paddingTop:'20px'}}>
                <Button type="submit" variant="primary">{selectedClass ? 'Güncelle' : 'Ekle'}</Button>
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>İptal</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- CSS STYLE INJECTION --- */}
      {/* background özelliğini (shorthand) kullanarak olası linear-gradient'leri eziyoruz */}
      <style>{`
        .btn-purple-force {
            background: #a855f7 !important; 
            background-color: #a855f7 !important;
            border-color: #a855f7 !important;
            color: #fff !important;
            box-shadow: 0 0 10px rgba(168, 85, 247, 0.4) !important;
        }
        .btn-purple-force:hover {
            background: #9333ea !important;
            background-color: #9333ea !important;
            box-shadow: 0 0 15px rgba(168, 85, 247, 0.6) !important;
        }
      `}</style>
    </div>
  );
};

export default AdminClass;
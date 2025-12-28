import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { FiPlus, FiEdit, FiTrash2, FiChevronDown, FiChevronRight, FiUser, FiCalendar, FiPhone, FiMail, FiClock, FiSearch } from 'react-icons/fi'; // FiSearch eklendi
import Header from '../common/Header';
import Button from '../common/Button';

// Takvim Sabitleri (Hafta sonları dahil)
const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
const HOURS = [
  '09:00-09:45', '09:55-10:40', '10:50-11:35', '11:45-12:30', 
  '12:40-13:25', '13:35-14:20', '14:30-15:15', '15:25-16:10', 
  '16:20-17:05', '17:15-18:00', '18:00-19:00'
];

const AdminTeacher = () => {
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [searchTerm, setSearchTerm] = useState(''); // Arama metni için state
  
  // Hangi öğretmenin detayının açık olduğunu tutan state
  const [expandedTeacherId, setExpandedTeacherId] = useState(null);

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    full_name: '',
    email: '',
    phone: '',
    birth_date: '',
    selected_classes: []
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchData();
  }, [showInactive]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [teachersRes, classesRes] = await Promise.all([
        adminAPI.getTeachers(!showInactive),
        adminAPI.getClasses()
      ]);

      let fetchedTeachers = teachersRes.data || (Array.isArray(teachersRes) ? teachersRes : []);

      if (showInactive) {
        fetchedTeachers = fetchedTeachers.filter(t => 
          t.is_active === 0 || 
          t.is_active === false || 
          t.status === 'inactive' || 
          (t.deleted_at && t.deleted_at !== null)
        );
      }

      setTeachers(fetchedTeachers);
      setClasses(classesRes.data || classesRes);
    } catch (error) {
      console.error('Veri çekme hatası:', error);
      setTeachers([]);
    } finally {
      setLoading(false);
    }
  };

  // --- FİLTRELEME MANTIĞI ---
  const filteredTeachers = teachers.filter((teacher) => {
    const term = searchTerm.toLowerCase();
    const fullName = teacher.full_name ? teacher.full_name.toLowerCase() : '';
    const username = teacher.username ? teacher.username.toLowerCase() : '';
    const email = teacher.email ? teacher.email.toLowerCase() : '';
    
    // İsim, Kullanıcı Adı veya Email içinde ara
    return fullName.includes(term) || username.includes(term) || email.includes(term);
  });

  const toggleRow = (id) => {
    setExpandedTeacherId(expandedTeacherId === id ? null : id);
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: '' });
  };

  const handleClassChange = (classId) => {
    setFormData(prev => {
      const currentClasses = prev.selected_classes || [];
      if (currentClasses.includes(classId)) {
        return { ...prev, selected_classes: currentClasses.filter(id => id !== classId) };
      } else {
        return { ...prev, selected_classes: [...currentClasses, classId] };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData, class_ids: formData.selected_classes };
      if (selectedTeacher) {
        await adminAPI.updateTeacher(selectedTeacher.id, payload);
        alert('Öğretmen güncellendi!');
      } else {
        await adminAPI.createTeacher(payload);
        alert('Öğretmen eklendi!');
      }
      closeModal();
      fetchData();
    } catch (error) {
      alert(error.message || 'Bir hata oluştu');
    }
  };

  const handleEdit = (teacher) => {
    setSelectedTeacher(teacher);
    const currentClassIds = teacher.classes ? teacher.classes.map(c => c.id) : [];
    setFormData({
      username: teacher.username,
      password: '',
      full_name: teacher.full_name,
      email: teacher.email,
      phone: teacher.phone || '',
      birth_date: teacher.birth_date || '',
      selected_classes: currentClassIds
    });
    setShowModal(true);
  };

  const handleDeactivate = async (id) => {
    if (window.confirm('Emin misiniz?')) {
      try {
        await adminAPI.deactivateTeacher(id);
        fetchData();
      } catch (error) { alert('Hata oluştu'); }
    }
  };

  const handleActivate = async (id) => {
    try {
      await adminAPI.activateTeacher(id);
      fetchData();
    } catch (error) { alert('Hata oluştu'); }
  };

  const openModal = () => {
    setSelectedTeacher(null);
    setFormData({ username: '', password: '', full_name: '', email: '', phone: '', birth_date: '', selected_classes: [] });
    setErrors({});
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedTeacher(null);
  };

  // --- TAKVİM FONKSİYONLARI ---

  // Öğretmenin tüm derslerinin programlarını birleştirir
  const getTeacherCombinedSchedule = (teacherClasses) => {
    if (!teacherClasses || teacherClasses.length === 0) return [];
    
    let combined = [];
    
    teacherClasses.forEach(cls => {
      // Backend'den gelen weekly_schedule verisini kontrol et
      if (cls.weekly_schedule) {
        try {
          const schedule = typeof cls.weekly_schedule === 'string' 
            ? JSON.parse(cls.weekly_schedule) 
            : cls.weekly_schedule;
            
          if (Array.isArray(schedule)) {
            schedule.forEach(slot => {
              combined.push({
                day: slot.day,
                hour: slot.hour,
                classCode: cls.class_code,
                className: cls.class_name
              });
            });
          }
        } catch (e) {
          console.error("Schedule parse error", e);
        }
      }
    });
    return combined;
  };

  // Takvimi Render Eden Fonksiyon
  const renderTeacherSchedule = (teacherClasses) => {
    const combinedSchedule = getTeacherCombinedSchedule(teacherClasses);

    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: `100px repeat(${DAYS.length}, 1fr)`,
        gap: '4px', marginTop: '10px', userSelect: 'none', fontSize: '0.75rem', overflowX: 'auto'
      }}>
        {/* Başlıklar */}
        <div></div>
        {DAYS.map(day => (
          <div key={day} style={{textAlign:'center', color:'var(--ai-cyan)', fontWeight:'bold', paddingBottom:'5px'}}>
            {day.substring(0,3)}
          </div>
        ))}

        {/* Satırlar */}
        {HOURS.map(hour => (
          <React.Fragment key={hour}>
            <div style={{
              color:'#cbd5e1', display:'flex', alignItems:'center', justifyContent:'flex-end', 
              paddingRight:'8px', borderRight:'1px solid rgba(255,255,255,0.1)'
            }}>
              {hour}
            </div>
            {DAYS.map(day => {
              // Bu gün ve saatte ders var mı?
              const activeSlot = combinedSchedule.find(s => s.day === day && s.hour === hour);
              
              return (
                <div 
                  key={`${day}-${hour}`}
                  title={activeSlot ? `${activeSlot.classCode} - ${activeSlot.className}` : ''}
                  style={{
                    backgroundColor: activeSlot ? 'var(--ai-blue)' : 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '4px', height: '35px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: activeSlot ? '#000' : 'transparent', 
                    fontWeight: 'bold', fontSize: '0.7em',
                    transition: 'all 0.2s', overflow: 'hidden', cursor: activeSlot ? 'help' : 'default'
                  }}
                >
                  {activeSlot ? activeSlot.classCode : ''}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    );
  };

  if (loading) return <div><Header title="Öğretmen Yönetimi" /><div className="spinner">Yükleniyor...</div></div>;

  return (
    <div>
      <Header title="Öğretmen Yönetimi" />
      <div className="page-actions">
        <Button onClick={openModal} icon={<FiPlus />} variant="primary">Yeni Öğretmen Ekle</Button>
        <Button variant="outline" onClick={() => setShowInactive(!showInactive)} style={{borderColor: showInactive ? '#ef4444' : 'var(--ai-mid)', color: showInactive ? '#ef4444' : 'var(--ai-cyan)'}}>
          {showInactive ? 'Aktif Öğretmenlere Dön' : 'İnaktif Öğretmenler'}
        </Button>
      </div>

      <div className="card">
        
        {/* --- ARAMA KUTUSU (YENİ EKLENEN KISIM) --- */}
        <div style={{ marginBottom: '20px', position: 'relative' }}>
          <div style={{ 
            position: 'absolute', 
            left: '15px', 
            top: '50%', 
            transform: 'translateY(-50%)', 
            color: 'var(--ai-cyan)',
            fontSize: '18px'
          }}>
            <FiSearch />
          </div>
          <input
            type="text"
            placeholder="Ad Soyad, Kullanıcı Adı veya Email ile ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 15px 12px 45px',
              borderRadius: '8px',
              border: '1px solid var(--ai-mid)',
              backgroundColor: 'rgba(0,0,0,0.2)',
              color: '#fff',
              fontSize: '1rem',
              outline: 'none'
            }}
          />
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{width: '40px'}}></th> 
                <th>Ad Soyad</th>
                <th>Kullanıcı Adı</th>
                <th>Email</th>
                <th>Telefon</th>
                <th>Verdiği Dersler</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filteredTeachers.length === 0 ? (
                <tr><td colSpan="7" className="text-center" style={{padding: '20px', color: '#cbd5e1'}}>
                    {searchTerm ? 'Aradığınız kriterlere uygun öğretmen bulunamadı.' : (showInactive ? 'Pasif öğretmen bulunmamaktadır.' : 'Öğretmen bulunamadı.')}
                </td></tr>
              ) : (
                filteredTeachers.map((teacher) => (
                  <React.Fragment key={teacher.id}>
                    <tr 
                      style={{cursor: 'pointer', backgroundColor: expandedTeacherId === teacher.id ? 'var(--ai-darkest)' : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.1)'}}
                      onClick={() => toggleRow(teacher.id)}
                    >
                      <td style={{textAlign: 'center', color: 'var(--ai-cyan)'}}>{expandedTeacherId === teacher.id ? <FiChevronDown size={20} /> : <FiChevronRight size={20} />}</td>
                      <td style={{fontWeight: '500', color:'#fff'}}>{teacher.full_name}</td>
                      <td>{teacher.username}</td>
                      <td>{teacher.email}</td>
                      <td>{teacher.phone || '-'}</td>
                      <td>
                        {teacher.classes && teacher.classes.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {teacher.classes.map((cls, index) => (
                               <span key={index} style={{backgroundColor: 'rgba(3, 201, 248, 0.1)', color: 'var(--ai-cyan)', border: '1px solid var(--ai-cyan)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.85em', display: 'inline-block'}}>
                                 {cls.class_name}
                               </span>
                            ))}
                          </div>
                        ) : (<span style={{color: '#999'}}>-</span>)}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-2">
                          <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(teacher)}><FiEdit /></button>
                          {showInactive ? (
                            <button className="btn btn-success btn-sm" onClick={() => handleActivate(teacher.id)}>Aktif Et</button>
                          ) : (
                            <button className="btn btn-danger btn-sm" onClick={() => handleDeactivate(teacher.id)}><FiTrash2 /></button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* DETAY SATIRI */}
                    {expandedTeacherId === teacher.id && (
                      <tr style={{backgroundColor: 'var(--ai-darkest)'}}>
                        <td colSpan="7" style={{padding: '0'}}>
                          <div style={{
                            padding: '20px 40px', borderTop: 'none', borderBottom: '1px solid var(--ai-mid)',
                            display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px', color: '#fff'
                          }}>
                            {/* SOL TARAF: BİLGİLER */}
                            <div>
                                <h4 style={{fontSize:'1rem', fontWeight:'600', color:'var(--ai-cyan)', marginBottom:'15px', borderBottom:'1px solid var(--ai-mid)', paddingBottom:'5px'}}>
                                    <FiUser style={{marginRight:'5px', verticalAlign:'middle'}}/> Kişisel Bilgiler
                                </h4>
                                <div style={{display:'grid', gap:'10px', fontSize:'0.95em'}}>
                                    <div><strong style={{color:'var(--ai-blue)'}}>Doğum Tarihi:</strong> {teacher.birth_date ? new Date(teacher.birth_date).toLocaleDateString('tr-TR') : '-'}</div>
                                    <div><strong style={{color:'var(--ai-blue)'}}>Telefon:</strong> {teacher.phone || '-'}</div>
                                    <div><strong style={{color:'var(--ai-blue)'}}>Email:</strong> {teacher.email}</div>
                                    <div><strong style={{color:'var(--ai-blue)'}}>Kayıt Tarihi:</strong> {teacher.created_at ? new Date(teacher.created_at).toLocaleDateString('tr-TR') : '-'}</div>
                                </div>
                                
                                <div style={{marginTop:'20px'}}>
                                  <h4 style={{fontSize:'1rem', fontWeight:'600', color:'var(--ai-cyan)', marginBottom:'15px', borderBottom:'1px solid var(--ai-mid)', paddingBottom:'5px'}}>
                                      Atanmış Dersler
                                  </h4>
                                  <div style={{display:'flex', flexWrap:'wrap', gap:'8px'}}>
                                    {teacher.classes && teacher.classes.length > 0 ? (
                                      teacher.classes.map(c => (
                                        <span key={c.id} style={{
                                          border: '1px solid var(--ai-mid)', padding: '4px 8px', borderRadius: '4px',
                                          backgroundColor: 'rgba(0,0,0,0.2)', fontSize: '0.9em'
                                        }}>
                                          {c.class_name} <span style={{color:'var(--ai-cyan)'}}>({c.class_code})</span>
                                        </span>
                                      ))
                                    ) : (<span style={{color:'#999', fontStyle:'italic'}}>Ders yok.</span>)}
                                  </div>
                                </div>
                            </div>
                            
                            {/* SAĞ TARAF: TAKVİM */}
                            <div>
                              <h4 style={{fontSize:'1rem', fontWeight:'600', color:'var(--ai-cyan)', marginBottom:'15px', borderBottom:'1px solid var(--ai-mid)', paddingBottom:'5px'}}>
                                <FiCalendar style={{marginRight:'5px', verticalAlign:'middle'}}/> Öğretmen Ders Programı
                              </h4>
                              <div style={{backgroundColor: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)'}}>
                                {teacher.classes && teacher.classes.length > 0 ? (
                                    renderTeacherSchedule(teacher.classes)
                                ) : (
                                    <div style={{color:'#999', fontStyle:'italic', padding:'10px', textAlign:'center'}}>
                                        Bu öğretmene henüz ders atanmamış, bu yüzden program boş.
                                    </div>
                                )}
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

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="card-title">{selectedTeacher ? 'Öğretmen Düzenle' : 'Yeni Öğretmen Ekle'}</h2>
            <form onSubmit={handleSubmit}>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
                <div>
                  <div className="input-group"><label>Kullanıcı Adı *</label><input type="text" name="username" value={formData.username} onChange={handleInputChange} disabled={selectedTeacher} /></div>
                  <div className="input-group"><label>Ad Soyad *</label><input type="text" name="full_name" value={formData.full_name} onChange={handleInputChange} /></div>
                  <div className="input-group"><label>Email *</label><input type="email" name="email" value={formData.email} onChange={handleInputChange} /></div>
                </div>
                <div>
                  {!selectedTeacher && (<div className="input-group"><label>Şifre *</label><input type="password" name="password" value={formData.password} onChange={handleInputChange} /></div>)}
                  <div className="input-group"><label>Telefon</label><input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} /></div>
                  <div className="input-group"><label>Doğum Tarihi</label><input type="date" name="birth_date" value={formData.birth_date} onChange={handleInputChange} /></div>
                </div>
              </div>

              <div className="input-group" style={{marginTop:'15px'}}>
                <label style={{marginBottom: '10px', display: 'block', fontWeight:'bold'}}>Atanacak Dersler</label>
                <div style={{border: '1px solid var(--ai-mid)', padding: '10px', borderRadius: '4px', maxHeight: '150px', overflowY: 'auto', backgroundColor: 'var(--ai-darkest)'}}>
                  {classes.length > 0 ? (
                    classes.map((cls) => (
                      <div key={cls.id} style={{marginBottom: '8px', display: 'flex', alignItems: 'center'}}>
                        <input type="checkbox" id={`class-${cls.id}`} checked={formData.selected_classes.includes(cls.id)} onChange={() => handleClassChange(cls.id)} style={{marginRight: '10px', width: '16px', height: '16px', cursor: 'pointer'}} />
                        <label htmlFor={`class-${cls.id}`} style={{cursor: 'pointer', margin: 0, fontSize:'0.95em', color: '#fff'}}>{cls.class_name} <span style={{color:'var(--ai-cyan)', fontSize:'0.85em'}}>({cls.class_code})</span></label>
                      </div>
                    ))
                  ) : (<div style={{color: '#999', fontStyle: 'italic'}}>Henüz sisteme ekli ders yok.</div>)}
                </div>
              </div>

              <div className="flex gap-2 mt-4" style={{borderTop:'1px solid var(--ai-mid)', paddingTop:'20px'}}>
                <Button type="submit" variant="primary">{selectedTeacher ? 'Güncelle' : 'Ekle'}</Button>
                <Button type="button" variant="outline" onClick={closeModal}>İptal</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTeacher;
import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { FiPlus, FiEdit, FiTrash2, FiChevronDown, FiChevronRight, FiSearch, FiAlertCircle } from 'react-icons/fi';
import Header from '../common/Header';
import Button from '../common/Button';

const AdminStudent = () => {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]); // Ders listesi için
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchTerm, setSearchTerm] = useState(''); // Arama metni için state
  
  // Accordion state (Açılır/Kapanır satır)
  const [expandedStudentId, setExpandedStudentId] = useState(null);

  const [formData, setFormData] = useState({
    student_number: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    birth_date: '',
    selected_classes: [],
    photos: [] // Dosyaları tutacak array
  });

  useEffect(() => {
    fetchData();
  }, [showInactive]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [studentsRes, classesRes] = await Promise.all([
        adminAPI.getStudents(!showInactive),
        adminAPI.getClasses() 
      ]);

      let fetchedStudents = Array.isArray(studentsRes.data) ? studentsRes.data : [];

      // Filtreleme: İnaktif modundaysak aktifleri temizle
      if (showInactive) {
        fetchedStudents = fetchedStudents.filter(s => 
          s.is_active === 0 || 
          s.is_active === false || 
          s.status === 'inactive' || 
          (s.deleted_at && s.deleted_at !== null)
        );
      }

      setStudents(fetchedStudents);
      setClasses(Array.isArray(classesRes.data) ? classesRes.data : []);
    } catch (e) {
      console.error(e);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  // --- FİLTRELEME MANTIĞI ---
  const filteredStudents = students.filter((student) => {
    const term = searchTerm.toLowerCase();
    const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
    const number = student.student_number ? student.student_number.toLowerCase() : '';
    const email = student.email ? student.email.toLowerCase() : '';
    
    // Numara, İsim veya Email içinde ara
    return fullName.includes(term) || number.includes(term) || email.includes(term);
  });

  const toggleRow = (id) => {
    setExpandedStudentId(expandedStudentId === id ? null : id);
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Çoklu ders seçimi
  const handleClassChange = (classId) => {
    setFormData(prev => {
      const current = prev.selected_classes || [];
      if (current.includes(classId)) {
        return { ...prev, selected_classes: current.filter(id => id !== classId) };
      } else {
        return { ...prev, selected_classes: [...current, classId] };
      }
    });
  };

  // Dosya seçimi
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setFormData({ ...formData, photos: files });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 5 Fotoğraf kontrolü (Sadece yeni kayıtta zorunlu)
    if (!selectedStudent && formData.photos.length !== 5) {
      alert('Lütfen tam olarak 5 adet fotoğraf yükleyin.');
      return;
    }

    try {
      const data = new FormData();
      data.append('student_number', formData.student_number);
      data.append('first_name', formData.first_name);
      data.append('last_name', formData.last_name);
      data.append('email', formData.email);
      data.append('phone', formData.phone);
      data.append('birth_date', formData.birth_date);

      formData.selected_classes.forEach(id => {
        data.append('class_ids[]', id);
      });

      formData.photos.forEach(file => {
        data.append('photos[]', file);
      });

      if (selectedStudent) {
        await adminAPI.updateStudent(selectedStudent.id, data);
        alert('Öğrenci güncellendi');
      } else {
        await adminAPI.createStudent(data);
        alert('Öğrenci ve fotoğraflar başarıyla kaydedildi');
      }
      closeModal();
      fetchData();
    } catch (error) {
      alert('İşlem başarısız: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleEdit = (s) => {
    setSelectedStudent(s);
    const currentClasses = s.classes ? s.classes.map(c => c.id) : [];
    
    setFormData({
      student_number: s.student_number,
      first_name: s.first_name,
      last_name: s.last_name,
      email: s.email,
      phone: s.phone || '',
      birth_date: s.birth_date || '',
      selected_classes: currentClasses,
      photos: [] 
    });
    setShowModal(true);
  };

  const handleDeactivate = async (id) => {
    if (!window.confirm('Öğrenci pasif yapılsın mı?')) return;
    try {
      await adminAPI.deactivateStudent(id);
      fetchData();
    } catch (error) {
      alert('Hata: ' + error.message);
    }
  };

  const handleActivate = async (id) => {
    if (!window.confirm('Bu öğrenciyi tekrar aktif etmek istiyor musunuz?')) return;
    try {
      await adminAPI.activateStudent(id);
      alert('Öğrenci aktif edildi');
      fetchData();
    } catch (error) {
      alert('Hata: ' + error.message);
    }
  };

  const openModal = () => {
    setSelectedStudent(null);
    setFormData({
      student_number: '',
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      birth_date: '',
      selected_classes: [],
      photos: []
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedStudent(null);
  };

  if (loading) return <div><Header title="Öğrenci Yönetimi" /><div className="spinner">Yükleniyor...</div></div>;

  return (
    <div>
      <Header title="Öğrenci Yönetimi" />

      {/* Üst Butonlar (Action Bar) */}
      <div className="page-actions">
        <Button onClick={openModal} icon={<FiPlus />} variant="primary">
          Yeni Öğrenci Ekle
        </Button>
        
        <Button 
          variant="outline" 
          onClick={() => setShowInactive(!showInactive)}
          style={{borderColor: showInactive ? '#ef4444' : 'var(--ai-mid)', color: showInactive ? '#ef4444' : 'var(--ai-cyan)'}}
        >
          {showInactive ? 'Aktif Öğrencilere Dön' : 'İnaktif Öğrenciler'}
        </Button>
      </div>

      <div className="card">

        {/* --- ARAMA KUTUSU --- */}
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
            placeholder="Ad, Soyad, Numara veya Email ile ara..."
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
                <th>No</th>
                <th>Ad Soyad</th>
                <th>Email</th>
                <th>Telefon</th>
                <th>Ders Sayısı</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr><td colSpan="7" className="no-data" style={{textAlign:'center', padding:'20px', color:'#cbd5e1'}}>
                  {searchTerm ? 'Aradığınız kriterlere uygun öğrenci bulunamadı.' : (showInactive ? 'Pasif öğrenci bulunmamaktadır.' : 'Öğrenci bulunamadı.')}
                </td></tr>
              ) : (
                filteredStudents.map((s) => (
                  <React.Fragment key={s.id}>
                    {/* ANA SATIR */}
                    <tr 
                      style={{cursor: 'pointer', backgroundColor: expandedStudentId === s.id ? 'rgba(3, 201, 248, 0.1)' : 'transparent'}}
                      onClick={() => toggleRow(s.id)}
                    >
                      <td style={{textAlign: 'center', color: 'var(--ai-cyan)'}}>
                        {expandedStudentId === s.id ? <FiChevronDown size={20} /> : <FiChevronRight size={20} />}
                      </td>
                      <td>{s.student_number}</td>
                      <td style={{fontWeight: '500'}}>{s.first_name} {s.last_name}</td>
                      <td>{s.email}</td>
                      <td>{s.phone || '-'}</td>
                      <td>
                         <span style={{
                           backgroundColor: s.classes?.length > 0 ? 'rgba(3, 201, 248, 0.1)' : 'transparent',
                           color: s.classes?.length > 0 ? 'var(--ai-cyan)' : '#6b7280',
                           border: s.classes?.length > 0 ? '1px solid var(--ai-cyan)' : '1px solid #4b5563',
                           padding: '2px 8px', borderRadius: '10px', fontSize: '0.85em'
                         }}>
                           {s.classes?.length || 0} Ders
                         </span>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-2">
                          <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(s)}>
                            <FiEdit />
                          </button>
                          
                          {showInactive ? (
                            <button 
                              className="btn btn-success btn-sm" 
                              onClick={(e) => { e.stopPropagation(); handleActivate(s.id); }}
                              title="Öğrenciyi Aktif Et"
                            >
                              Aktif Et
                            </button>
                          ) : (
                            <button 
                              className="btn btn-danger btn-sm"
                              onClick={(e) => { e.stopPropagation(); handleDeactivate(s.id); }}
                              title="Öğrenciyi Pasife Al"
                            >
                              <FiTrash2 />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* DETAY SATIRI (Accordion) */}
                    {expandedStudentId === s.id && (
                      <tr style={{backgroundColor: 'rgba(13, 74, 107, 0.5)'}}>
                        <td colSpan="7" style={{padding: '0'}}>
                          <div style={{
                            padding: '20px 40px', 
                            borderTop: '1px solid var(--ai-mid)',
                            borderBottom: '1px solid var(--ai-mid)',
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr', 
                            gap: '30px',
                            color: '#fff'
                          }}>
                            {/* SOL KOLON: Öğrenci ve Ders Bilgileri */}
                            <div>
                                <h4 style={{marginBottom:'15px', color:'var(--ai-cyan)', borderBottom:'1px solid var(--ai-mid)', paddingBottom:'5px'}}>Öğrenci Bilgileri</h4>
                                <div style={{display:'grid', gap:'10px', fontSize:'0.95em'}}>
                                    <div><strong style={{color:'var(--ai-blue)'}}>Doğum Tarihi:</strong> {s.birth_date || '-'}</div>
                                    <div><strong style={{color:'var(--ai-blue)'}}>Telefon:</strong> {s.phone || '-'}</div>
                                    <div><strong style={{color:'var(--ai-blue)'}}>Email:</strong> {s.email}</div>
                                </div>

                                {/* --- GÜNCELLENEN KISIM: DEVAMSIZLIK TABLOSU --- */}
                                <h4 style={{marginTop:'25px', marginBottom:'10px', color:'var(--ai-cyan)', borderBottom:'1px solid var(--ai-mid)', paddingBottom:'5px'}}>
                                    Dersler ve Devamsızlık Durumu
                                </h4>
                                {s.classes && s.classes.length > 0 ? (
                                    <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '0.9em', marginTop:'10px'}}>
                                        <thead>
                                            <tr style={{color:'#94a3b8', textAlign:'left', borderBottom:'1px solid rgba(255,255,255,0.1)'}}>
                                                <th style={{padding:'8px 5px'}}>Ders Adı</th>
                                                <th style={{padding:'8px 5px', textAlign:'center'}}>Kullanılan</th>
                                                <th style={{padding:'8px 5px', textAlign:'center'}}>Kalan Hak</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {s.classes.map(cls => (
                                                <tr key={cls.id} style={{borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                                                    <td style={{padding:'10px 5px'}}>
                                                        <div style={{fontWeight:'500', color:'#fff'}}>{cls.class_name}</div>
                                                        <div style={{fontSize:'0.8em', color:'var(--ai-cyan)'}}>{cls.class_code}</div>
                                                    </td>
                                                    <td style={{padding:'10px 5px', textAlign:'center'}}>
                                                        <span style={{color: '#ef4444', fontWeight: 'bold', fontSize:'1.1em'}}>
                                                            {cls.absences_count !== undefined ? cls.absences_count : '-'}
                                                        </span>
                                                    </td>
                                                    <td style={{padding:'10px 5px', textAlign:'center'}}>
                                                        <span style={{color: '#10b981', fontWeight: 'bold', fontSize:'1.1em'}}>
                                                            {cls.remaining_absences !== undefined ? cls.remaining_absences : '4'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div style={{color:'#999', fontStyle:'italic', marginTop:'10px'}}>
                                        <FiAlertCircle style={{marginRight:'5px', verticalAlign:'middle'}}/>
                                        Henüz atanmış ders bulunmamaktadır.
                                    </div>
                                )}
                            </div>

                            {/* SAĞ KOLON: Fotoğraflar */}
                            <div>
                                <h4 style={{marginBottom:'15px', color:'var(--ai-cyan)', borderBottom:'1px solid var(--ai-mid)', paddingBottom:'5px'}}>Kayıtlı Fotoğraflar</h4>
                                <div style={{display:'flex', gap:'10px', flexWrap: 'wrap'}}>
                                    {s.photos && s.photos.length > 0 ? (
                                        s.photos.map((photo, idx) => (
                                            <div key={idx} style={{textAlign:'center', marginBottom:'10px'}}>
                                                <img 
                                                    src={`http://localhost/attendify/frontend/public${photo.photo_path}`} 
                                                    alt={`Angle ${idx}`}
                                                    style={{
                                                        width:'100px', height:'100px', objectFit:'cover', 
                                                        borderRadius:'8px', border:'1px solid var(--ai-mid)'
                                                    }}
                                                />
                                                <div style={{fontSize:'0.75em', marginTop:'4px', color:'#cbd5e1'}}>{photo.photo_type}</div>
                                            </div>
                                        ))
                                    ) : (
                                        <div style={{color:'#999', fontStyle:'italic'}}>
                                            Fotoğraf bulunamadı.
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
            <h2 className="card-title">
              {selectedStudent ? 'Öğrenci Düzenle' : 'Yeni Öğrenci Ekle'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <div className="input-group">
                        <label>Öğrenci No *</label>
                        <input type="text" name="student_number" value={formData.student_number} onChange={handleInputChange} required />
                    </div>
                    <div className="input-group">
                        <label>Ad *</label>
                        <input type="text" name="first_name" value={formData.first_name} onChange={handleInputChange} required />
                    </div>
                    <div className="input-group">
                        <label>Soyad *</label>
                        <input type="text" name="last_name" value={formData.last_name} onChange={handleInputChange} required />
                    </div>
                 </div>

                 <div>
                    <div className="input-group">
                        <label>Email *</label>
                        <input type="email" name="email" value={formData.email} onChange={handleInputChange} required />
                    </div>
                    <div className="input-group">
                        <label>Telefon</label>
                        <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} />
                    </div>
                    <div className="input-group">
                        <label>Doğum Tarihi</label>
                        <input type="date" name="birth_date" value={formData.birth_date} onChange={handleInputChange} />
                    </div>
                 </div>
              </div>

              {!selectedStudent && (
                  <div className="input-group" style={{marginTop:'10px', padding:'10px', backgroundColor:'rgba(255, 0, 0, 0.1)', border:'1px dashed #fc8181', borderRadius:'6px'}}>
                    <label style={{color:'#fc8181', fontWeight:'bold'}}>Zorunlu: 5 Adet Fotoğraf Yükleyiniz</label>
                    <div style={{fontSize:'0.85em', color:'#cbd5e1', marginBottom:'5px'}}>Öğrencinin yüz tanıma sistemi için farklı açılardan 5 fotoğrafını seçiniz.</div>
                    <input 
                        type="file" 
                        multiple 
                        accept="image/*"
                        onChange={handleFileChange}
                        required={!selectedStudent}
                        style={{backgroundColor:'transparent', border:'none', color:'#fff'}}
                    />
                    {formData.photos.length > 0 && (
                        <div style={{marginTop:'5px', fontSize:'0.9em', color: formData.photos.length === 5 ? 'var(--ai-cyan)' : '#fc8181'}}>
                            {formData.photos.length} adet fotoğraf seçildi. {formData.photos.length !== 5 && '(Tam olarak 5 olmalı)'}
                        </div>
                    )}
                  </div>
              )}

              <div className="input-group mt-3">
                <label style={{marginBottom: '10px', display: 'block', fontWeight:'bold'}}>Ders Atamaları</label>
                <div style={{
                  border: '1px solid var(--ai-mid)', padding: '10px', borderRadius: '4px', 
                  maxHeight: '120px', overflowY: 'auto', backgroundColor: 'var(--ai-darkest)'
                }}>
                  {classes.map((cls) => (
                    <div key={cls.id} style={{marginBottom: '5px', display: 'flex', alignItems: 'center'}}>
                      <input
                        type="checkbox"
                        id={`s-class-${cls.id}`}
                        checked={formData.selected_classes.includes(cls.id)}
                        onChange={() => handleClassChange(cls.id)}
                        style={{
                            marginRight: '10px', 
                            width: '16px',   
                            height: '16px',  
                            cursor: 'pointer',
                            flexShrink: 0
                        }}
                      />
                      <label htmlFor={`s-class-${cls.id}`} style={{margin: 0, fontSize:'0.9em', cursor:'pointer', color:'#fff'}}>
                        {cls.class_name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Button type="submit" variant="primary">
                  {selectedStudent ? 'Güncelle' : 'Kaydet'}
                </Button>
                <Button type="button" variant="outline" onClick={closeModal}>
                  İptal
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStudent;
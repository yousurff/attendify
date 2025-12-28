import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import Header from '../common/Header';
import { FiCalendar, FiClock, FiUser, FiBook, FiCheckCircle, FiXCircle, FiSearch, FiFilter } from 'react-icons/fi';

const AdminAttendance = () => {
  const [attendances, setAttendances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAttendances();
  }, []);

  const fetchAttendances = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getAllAttendances(); 
      // Backend'den gelen veri: { success: true, data: [...] }
      setAttendances(response.data || []);
    } catch (err) {
      console.error("Yoklama verileri çekilemedi:", err);
      setError('Yoklama kayıtları yüklenirken bir sorun oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // --- FİLTRELEME ---
  const filteredAttendances = attendances.filter(item => {
    const term = searchTerm.toLowerCase();
    const className = item.class_name ? item.class_name.toLowerCase() : '';
    const teacherName = item.teacher_name ? item.teacher_name.toLowerCase() : '';
    const classCode = item.class_code ? item.class_code.toLowerCase() : '';
    
    return (
        className.includes(term) ||
        teacherName.includes(term) ||
        classCode.includes(term)
    );
  });

  // --- TARİH FORMATLAMA ---
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div>
      <Header title="Alınan Yoklamalar" />
      
      {/* ARAMA VE BİLGİ ALANI */}
      <div className="card" style={{marginTop: '30px', padding: '20px', display:'flex', alignItems:'center', gap:'15px'}}>
         <div style={{position:'relative', flex:1}}>
            <FiSearch style={{position:'absolute', left:'15px', top:'50%', transform:'translateY(-50%)', color:'var(--ai-cyan)'}} />
            <input 
                type="text" 
                placeholder="Ders adı, kodu veya öğretmen adı ile ara..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                    width:'100%', padding:'12px 12px 12px 45px', 
                    borderRadius:'8px', border:'1px solid var(--ai-mid)',
                    backgroundColor:'var(--ai-darkest)', color:'#fff', outline:'none'
                }}
            />
         </div>
         <div style={{color:'#cbd5e1', fontSize:'0.9rem', whiteSpace: 'nowrap'}}>
            Toplam Kayıt: <strong style={{color:'#fff'}}>{filteredAttendances.length}</strong>
         </div>
      </div>

      {/* TABLO ALANI */}
      <div className="card">
        {loading ? (
            <div className="spinner" style={{textAlign:'center', padding:'40px', color:'#cbd5e1'}}>Yükleniyor...</div>
        ) : error ? (
            <div style={{textAlign:'center', padding:'40px', color:'#ef4444'}}>{error}</div>
        ) : (
            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Tarih</th>
                            <th>Ders Bilgisi</th>
                            <th>Öğretmen</th>
                            <th>Süre</th>
                            <th style={{textAlign:'center'}}>Katılım Durumu</th>
                            <th style={{textAlign:'center'}}>Oran</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredAttendances.length === 0 ? (
                            <tr><td colSpan="6" style={{textAlign:'center', padding:'30px', color:'#999'}}>Kayıt bulunamadı.</td></tr>
                        ) : (
                            filteredAttendances.map((item) => {
                                const total = item.total_students || 1; // 0'a bölme hatası olmasın
                                const present = item.present_count || 0;
                                const absent = item.absent_count || 0;
                                const rate = Math.round((present / total) * 100);
                                
                                return (
                                    <tr key={item.id}>
                                        <td>
                                            <div style={{display:'flex', flexDirection:'column'}}>
                                                <span style={{color:'#fff', fontWeight:'500'}}><FiCalendar style={{marginRight:'5px'}}/> {formatDate(item.attendance_date)}</span>
                                                <span style={{color:'#cbd5e1', fontSize:'0.85rem', marginTop:'4px'}}><FiClock style={{marginRight:'5px'}}/> {item.attendance_time}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{display:'flex', flexDirection:'column'}}>
                                                <span style={{color:'var(--ai-cyan)', fontWeight:'bold'}}>{item.class_name}</span>
                                                <span style={{color:'#94a3b8', fontSize:'0.85rem'}}>{item.class_code}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{display:'flex', alignItems:'center', gap:'8px', color:'#fff'}}>
                                                <div style={{width:'30px', height:'30px', borderRadius:'50%', backgroundColor:'rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center'}}>
                                                    <FiUser />
                                                </div>
                                                {item.teacher_name}
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{backgroundColor:'rgba(255,255,255,0.05)', padding:'4px 10px', borderRadius:'6px', color:'#cbd5e1', fontSize:'0.9rem'}}>
                                                {item.duration_minutes} dk
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{display:'flex', justifyContent:'center', gap:'20px'}}>
                                                <div style={{textAlign:'center'}} title="Katılan Öğrenci Sayısı">
                                                    <div style={{color:'#10b981', fontWeight:'bold', fontSize:'1.1rem'}}>{present}</div>
                                                    <div style={{fontSize:'0.7rem', color:'#10b981', opacity:0.8}}>VAR</div>
                                                </div>
                                                <div style={{textAlign:'center'}} title="Katılmayan Öğrenci Sayısı">
                                                    <div style={{color:'#ef4444', fontWeight:'bold', fontSize:'1.1rem'}}>{absent}</div>
                                                    <div style={{fontSize:'0.7rem', color:'#ef4444', opacity:0.8}}>YOK</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{textAlign:'center'}}>
                                            <div style={{
                                                width:'45px', height:'45px', borderRadius:'50%', 
                                                border: `3px solid ${rate >= 70 ? '#10b981' : rate >= 40 ? '#f59e0b' : '#ef4444'}`,
                                                display:'flex', alignItems:'center', justifyContent:'center',
                                                fontSize:'0.85rem', fontWeight:'bold', color:'#fff', margin:'0 auto',
                                                boxShadow: '0 0 10px rgba(0,0,0,0.2)'
                                            }}>
                                                %{rate}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        )}
      </div>
    </div>
  );
};

export default AdminAttendance;
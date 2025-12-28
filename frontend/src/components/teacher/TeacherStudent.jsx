import React, { useState, useEffect } from 'react';
import { teacherAPI } from '../../services/api';
import Header from '../common/Header';
import { FiSearch } from 'react-icons/fi';

const TeacherStudent = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await teacherAPI.getMyStudents();
      setStudents(response.data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students
    .filter((student) => {
      const term = searchTerm.toLowerCase();
      const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
      const studentNo = student.student_number ? student.student_number.toLowerCase() : '';
      return fullName.includes(term) || studentNo.includes(term);
    })
    .sort((a, b) => {
      return (a.student_number || '').localeCompare(b.student_number || '');
    });

  return (
    <div>
      <Header title="Öğrencilerim" />
      
      {/* marginTop: 30px eklendi */}
      <div className="card" style={{ marginTop: '30px' }}>
        
        {/* ARAMA KUTUSU */}
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
            placeholder="Öğrenci Adı veya Numarası ile ara..."
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
                <th>Öğrenci No</th>
                <th>Ad Soyad</th>
                <th>Email</th>
                <th>Dersler ve Devamsızlık Durumu</th>
              </tr>
            </thead>
            <tbody>
              {/* İçerik Yükleniyorsa Spinner Göster, Değilse Listeyi Göster */}
              {loading ? (
                <tr>
                    <td colSpan="4" style={{textAlign:'center', padding:'40px', color:'#cbd5e1'}}>
                        <div className="spinner" style={{margin:'0 auto 10px'}}></div>
                        Yükleniyor...
                    </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                    <td colSpan="4" style={{textAlign:'center', padding:'20px', color:'#cbd5e1', fontStyle:'italic'}}>
                        {searchTerm ? 'Aradığınız kriterlere uygun öğrenci bulunamadı.' : 'Derslerinizi alan kayıtlı öğrenci bulunamadı.'}
                    </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.id}>
                    <td style={{fontWeight:'bold', color:'var(--ai-cyan)'}}>{student.student_number}</td>
                    <td style={{fontWeight:'500'}}>{student.first_name} {student.last_name}</td>
                    <td>{student.email}</td>
                    <td>
                      {student.classes && student.classes.length > 0 ? (
                        student.classes.map((cls) => (
                          <div key={cls.id} style={{marginBottom: '6px', fontSize:'0.9em', display:'flex', alignItems:'center'}}>
                            <span style={{color:'#fff', fontWeight:'500', marginRight:'10px'}}>{cls.class_name}</span>
                            <span style={{
                                backgroundColor: 'rgba(255,255,255,0.05)', 
                                padding:'2px 8px', borderRadius:'4px', 
                                border: '1px solid var(--ai-mid)',
                                color: '#cbd5e1'
                            }}>
                               Devamsızlık: <span style={{color: cls.remaining_absences <= 1 ? '#ef4444' : 'var(--ai-blue)', fontWeight:'bold'}}>{cls.absences_count}</span>
                               <span style={{fontSize:'0.85em', marginLeft:'5px', opacity:0.7}}>(Kalan: {cls.remaining_absences})</span>
                            </span>
                          </div>
                        ))
                      ) : (
                        <span style={{color:'#999', fontStyle:'italic'}}>-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TeacherStudent;
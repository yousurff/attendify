import React, { useState, useEffect } from 'react';
import { teacherAPI } from '../../services/api';
import Header from '../common/Header';
import { FiUser, FiMail, FiPhone, FiBook, FiUsers, FiCalendar } from 'react-icons/fi';

const TeacherProfile = () => {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await teacherAPI.getProfile();
      setProfile(response.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Ortak Kart Stili
  const cardStyle = {
    backgroundColor: 'var(--ai-dark)', // Koyu Lacivert
    border: '1px solid var(--ai-mid)', // Neon Çizgi
    padding: '30px',
    borderRadius: '12px',
    color: '#fff',
    marginBottom: '30px'
  };

  const statCardStyle = {
    backgroundColor: 'rgba(3, 201, 248, 0.1)',
    border: '1px solid var(--ai-mid)',
    borderRadius: '12px',
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '20px'
  };

  if (!profile) return <div><Header title="Profil" /><div className="spinner">Yükleniyor...</div></div>;

  return (
    <div>
      <Header title="Profilim" />
      
      {/* Üst İstatistik Kartları */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px', marginTop: '20px'}}>
        
        {/* Ders Sayısı */}
        <div style={statCardStyle}>
            <div style={{fontSize: '2rem', color: 'var(--ai-cyan)'}}><FiBook /></div>
            <div>
                <div style={{fontSize: '0.9em', color: '#cbd5e1'}}>Verilen Ders Sayısı</div>
                <div style={{fontSize: '1.5rem', fontWeight: 'bold', color: '#fff'}}>{profile.class_count || 0}</div>
            </div>
        </div>

        {/* Öğrenci Sayısı */}
        <div style={{...statCardStyle, backgroundColor: 'rgba(255, 0, 128, 0.1)', borderColor: '#ff0080'}}>
            <div style={{fontSize: '2rem', color: '#ff0080'}}><FiUsers /></div>
            <div>
                <div style={{fontSize: '0.9em', color: '#cbd5e1'}}>Toplam Öğrenci</div>
                <div style={{fontSize: '1.5rem', fontWeight: 'bold', color: '#fff'}}>{profile.student_count || 0}</div>
            </div>
        </div>

      </div>

      {/* Detaylı Bilgiler Kartı */}
      <div style={cardStyle}>
        <h3 style={{color: 'var(--ai-cyan)', borderBottom: '1px solid var(--ai-mid)', paddingBottom: '15px', marginBottom: '20px', display:'flex', alignItems:'center', gap:'10px'}}>
          <FiUser /> Kişisel Bilgiler
        </h3>
        
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px'}}>
            <div>
                <div style={{marginBottom: '20px'}}>
                    <label style={{color: 'var(--ai-blue)', fontSize: '0.9em', display:'block', marginBottom:'5px'}}>Ad Soyad</label>
                    <div style={{fontSize: '1.1em', fontWeight: '500'}}>{profile.full_name}</div>
                </div>
                <div>
                    <label style={{color: 'var(--ai-blue)', fontSize: '0.9em', display:'block', marginBottom:'5px'}}>Kullanıcı Adı</label>
                    <div style={{fontSize: '1.1em'}}>{profile.username}</div>
                </div>
            </div>

            <div>
                <div style={{marginBottom: '20px'}}>
                    <label style={{color: 'var(--ai-blue)', fontSize: '0.9em', display:'block', marginBottom:'5px'}}><FiMail style={{verticalAlign:'middle'}}/> E-posta</label>
                    <div style={{fontSize: '1.1em'}}>{profile.email}</div>
                </div>
                <div style={{marginBottom: '20px'}}>
                    <label style={{color: 'var(--ai-blue)', fontSize: '0.9em', display:'block', marginBottom:'5px'}}><FiPhone style={{verticalAlign:'middle'}}/> Telefon</label>
                    <div style={{fontSize: '1.1em'}}>{profile.phone || '-'}</div>
                </div>
                <div>
                    <label style={{color: 'var(--ai-blue)', fontSize: '0.9em', display:'block', marginBottom:'5px'}}><FiCalendar style={{verticalAlign:'middle'}}/> Kayıt Tarihi</label>
                    <div style={{fontSize: '1.1em'}}>{profile.created_at ? new Date(profile.created_at).toLocaleDateString('tr-TR') : '-'}</div>
                </div>
            </div>
        </div>
      </div>

    </div>
  );
};

export default TeacherProfile;
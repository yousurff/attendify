import React, { useState, useEffect, useRef } from 'react';
import { authAPI, adminAPI } from '../../services/api';
import Header from '../common/Header';
import Button from '../common/Button';
import { FiCamera, FiVideo, FiUserCheck, FiActivity, FiCpu, FiAlertCircle, FiLock, FiSave } from 'react-icons/fi';

const AdminSettings = () => {
  // --- ŞİFRE DEĞİŞTİRME STATE ---
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  // --- TEST KAMERASI STATE ---
  const [students, setStudents] = useState([]);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [detectedStudent, setDetectedStudent] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);

  useEffect(() => {
    const fetchStudents = async () => {
        try {
            const response = await adminAPI.getStudents(false);
            setStudents(response.data || []);
        } catch (e) {
            console.error("Öğrenci listesi çekilemedi", e);
        }
    };
    fetchStudents();

    return () => stopCamera();
  }, []);

  // Kamera aktifleştiğinde stream'i video elementine bağla
  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
    }
  }, [isCameraActive]);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordData.new_password !== passwordData.confirm_password) {
      alert('Yeni şifreler eşleşmiyor!');
      return;
    }
    try {
      await authAPI.changePassword({
        current_password: passwordData.current_password,
        new_password: passwordData.new_password
      });
      alert('Şifre başarıyla değiştirildi!');
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
    } catch (error) {
      alert(error.message || 'Şifre değiştirilemedi');
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      setIsCameraActive(true);
      startFaceRecognitionLoop();
    } catch (err) {
      alert('Kameraya erişilemedi: ' + err.message);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    
    setIsCameraActive(false);
    setIsScanning(false);
    setDetectedStudent(null);
  };

  const startFaceRecognitionLoop = () => {
    scanIntervalRef.current = setInterval(async () => {
        if (!videoRef.current) return;

        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(async (blob) => {
            if (!blob) return;
            const formData = new FormData();
            formData.append('file', blob, 'capture.jpg');

            try {
                setIsScanning(true);
                const response = await fetch('http://localhost:8000/recognize', {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    const result = await response.json();
                    
                    if (result.found_students && result.found_students.length > 0) {
                        const foundNumber = String(result.found_students[0]);
                        const matchedStudent = students.find(s => String(s.student_number) === foundNumber);
                        
                        if (matchedStudent) {
                            setDetectedStudent(matchedStudent);
                        }
                    }
                }
            } catch (err) {
                // Sessizce devam et
            } finally {
                setTimeout(() => setIsScanning(false), 500);
            }
        }, 'image/jpeg');
    }, 1000);
  };

  // --- MERKEZİ BOŞLUK AYARI ---
  // Bu değeri değiştirdiğinizde hem kartlar arası hem de alttaki kutular arası boşluk aynı anda değişir.
  const GAP_SIZE = '8px'; 

  return (
    <div style={{paddingBottom: '50px'}}>
      <Header title="Sistem Ayarları ve Test" />
      
      {/* ANA CONTAINER: Kartlar arası boşluk burada (GAP_SIZE) */}
      <div style={{marginTop: '30px', display: 'flex', flexDirection: 'column', gap: GAP_SIZE}}>
        
        {/* --- 1. ŞİFRE DEĞİŞTİRME KARTI --- */}
        <div className="card" style={{
            backgroundColor: 'var(--ai-dark)', 
            border: '1px solid var(--ai-mid)', 
            padding: '20px 25px', 
            borderRadius: '12px'
        }}>
            <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'15px', borderBottom:'1px solid rgba(255,255,255,0.1)', paddingBottom:'10px'}}>
                <FiLock size={20} color="var(--ai-cyan)" />
                <h3 style={{margin:0, color:'#fff', fontSize:'1.1rem'}}>Güvenlik Ayarları</h3>
            </div>
            
            <form onSubmit={handlePasswordChange} style={{
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr)) auto', 
                gap: GAP_SIZE, 
                alignItems: 'end'
            }}>
                <div style={{display:'flex', flexDirection:'column', gap:'5px'}}>
                    <label style={{color: '#94a3b8', fontSize:'0.85rem'}}>Mevcut Şifre</label>
                    <input type="password" value={passwordData.current_password} onChange={(e) => setPasswordData({...passwordData, current_password: e.target.value})} required style={{backgroundColor: 'var(--ai-darkest)', color: '#fff', border: '1px solid var(--ai-mid)', padding:'10px', borderRadius:'6px'}} placeholder="******" />
                </div>
                <div style={{display:'flex', flexDirection:'column', gap:'5px'}}>
                    <label style={{color: '#94a3b8', fontSize:'0.85rem'}}>Yeni Şifre</label>
                    <input type="password" value={passwordData.new_password} onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})} required style={{backgroundColor: 'var(--ai-darkest)', color: '#fff', border: '1px solid var(--ai-mid)', padding:'10px', borderRadius:'6px'}} placeholder="******" />
                </div>
                <div style={{display:'flex', flexDirection:'column', gap:'5px'}}>
                    <label style={{color: '#94a3b8', fontSize:'0.85rem'}}>Yeni Şifre (Tekrar)</label>
                    <input type="password" value={passwordData.confirm_password} onChange={(e) => setPasswordData({...passwordData, confirm_password: e.target.value})} required style={{backgroundColor: 'var(--ai-darkest)', color: '#fff', border: '1px solid var(--ai-mid)', padding:'10px', borderRadius:'6px'}} placeholder="******" />
                </div>
                <div style={{paddingBottom:'2px'}}>
                    <Button type="submit" variant="primary" icon={<FiSave />}>Güncelle</Button>
                </div>
            </form>
        </div>

        {/* --- 2. YAPAY ZEKA TEST KARTI --- */}
        <div className="card" style={{
            backgroundColor: 'var(--ai-dark)', 
            border: '1px solid var(--ai-mid)', 
            padding: '0', 
            borderRadius: '12px',
            overflow: 'hidden'
        }}>
            <div style={{
                padding: '15px 25px', 
                borderBottom: '1px solid rgba(255,255,255,0.1)', 
                display:'flex', justifyContent:'space-between', alignItems:'center',
                backgroundColor: 'rgba(0,0,0,0.2)'
            }}>
                <h3 style={{margin:0, color: '#fff', display:'flex', alignItems:'center', gap:'10px', fontSize:'1.1rem'}}>
                    <FiCpu size={20} color="var(--ai-cyan)"/> Yapay Zeka Test Laboratuvarı
                </h3>
                {isCameraActive ? (
                    <Button onClick={stopCamera} variant="danger" icon={<FiVideo />}>Kamerayı Kapat</Button>
                ) : (
                    <Button onClick={startCamera} variant="outline" icon={<FiCamera />} style={{borderColor:'#10b981', color:'#10b981'}}>Testi Başlat</Button>
                )}
            </div>

            <div style={{padding: '25px'}}>
                
                {/* GRID: Alttaki iki kutu arasındaki boşluk burada (gap: GAP_SIZE).
                    Üstteki kartlar arasındaki boşlukla (30px) birebir aynı.
                */}
                <div style={{
                    display: 'grid', 
                    gridTemplateColumns: '7fr 3fr', 
                    height: '650px', 
                    gap: GAP_SIZE 
                }}>
                    
                    {/* KUTU 1: KAMERA ALANI */}
                    <div style={{
                        backgroundColor: '#000', 
                        position: 'relative', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        borderRadius: '8px',
                        border: '1px solid var(--ai-mid)',
                        overflow: 'hidden'
                    }}>
                        {isCameraActive ? (
                            <>
                                <video 
                                    ref={videoRef} 
                                    autoPlay 
                                    playsInline 
                                    muted 
                                    style={{
                                        width: '100%', 
                                        height: '100%', 
                                        objectFit: 'cover',
                                        transform: 'scaleX(-1)'
                                    }} 
                                />
                                <div style={{
                                    position: 'absolute', top: '0', left: '0', width: '100%', height: '100%',
                                    pointerEvents: 'none',
                                    border: isScanning ? '2px solid rgba(16, 185, 129, 0.5)' : 'none',
                                    transition: 'border 0.3s'
                                }}>
                                    {isScanning && (
                                        <div style={{
                                            position:'absolute', bottom:'10px', right:'10px',
                                            backgroundColor:'rgba(0,0,0,0.7)', color:'#10b981', padding:'4px 8px', borderRadius:'4px',
                                            display:'flex', alignItems:'center', gap:'5px', fontSize:'0.7rem'
                                        }}>
                                            <FiActivity className="spin"/> Analiz
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div style={{textAlign:'center', color:'#64748b'}}>
                                <FiCamera size={64} style={{marginBottom:'20px', opacity: 0.3}} />
                                <p style={{fontSize:'1.1rem'}}>Test etmek için kamerayı başlatın.</p>
                            </div>
                        )}
                    </div>

                    {/* KUTU 2: SONUÇ PANELİ */}
                    <div style={{
                        backgroundColor: 'var(--ai-darkest)',
                        borderRadius: '8px',
                        border: '1px solid var(--ai-mid)',
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <h4 style={{color:'#94a3b8', marginBottom:'30px', textTransform:'uppercase', letterSpacing:'1px', fontSize:'0.8rem'}}>Algılanan Kişi</h4>
                        
                        {detectedStudent ? (
                            <div style={{textAlign:'center', animation: 'fadeIn 0.5s', width:'100%'}}>
                                <div style={{
                                    width:'140px', height:'140px', borderRadius:'50%', 
                                    border:'4px solid #10b981', padding:'4px', margin:'0 auto 20px',
                                    overflow:'hidden', backgroundColor:'#000',
                                    boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)'
                                }}>
                                    {detectedStudent.photos && detectedStudent.photos.length > 0 ? (
                                        <img src={`http://localhost/attendify/frontend/public${detectedStudent.photos[0].photo_path}`} style={{width:'100%', height:'100%', objectFit:'cover', borderRadius:'50%'}} alt="Student" />
                                    ) : (
                                        <div style={{width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', backgroundColor:'#334155'}}><FiUserCheck size={50}/></div>
                                    )}
                                </div>
                                
                                <h2 style={{margin:'0 0 10px 0', color:'#fff', fontSize:'1.4rem'}}>{detectedStudent.first_name} {detectedStudent.last_name}</h2>
                                <div style={{backgroundColor:'#334155', display:'inline-block', padding:'5px 15px', borderRadius:'6px', color:'#fff', fontWeight:'bold', fontSize:'1rem', marginBottom:'20px'}}>
                                    {detectedStudent.student_number}
                                </div>
                                
                                <div>
                                    <span style={{
                                        backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', 
                                        padding: '8px 20px', borderRadius: '30px', 
                                        fontSize: '0.85rem', fontWeight: 'bold', border: '1px solid rgba(16, 185, 129, 0.3)',
                                        display: 'inline-flex', alignItems: 'center', gap: '8px'
                                    }}>
                                        <FiUserCheck /> EŞLEŞME BAŞARILI
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div style={{textAlign:'center', color:'#64748b', opacity: 0.6}}>
                                 {isCameraActive ? (
                                    <>
                                        <div className="pulse-ring" style={{
                                            width:'80px', height:'80px', margin:'0 auto 20px', 
                                            borderRadius:'50%', border:'2px dashed var(--ai-mid)',
                                            display:'flex', alignItems:'center', justifyContent:'center'
                                        }}>
                                            <FiUserCheck size={30}/>
                                        </div>
                                        <p>Yüz taranıyor...</p>
                                    </>
                                ) : (
                                    <>
                                        <FiAlertCircle size={40} style={{marginBottom:'15px'}}/>
                                        <p>Bekleniyor...</p>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>

      </div>
      
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default AdminSettings;
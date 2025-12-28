import React, { useState, useEffect, useRef } from 'react';
import { teacherAPI } from '../../services/api';
import Header from '../common/Header';
import Button from '../common/Button';
import { 
  FiCamera, 
  FiStopCircle, 
  FiGrid, 
  FiAlertCircle, 
  FiVideo, 
  FiClock, 
  FiUserCheck, 
  FiUserX, 
  FiCheckCircle,
  FiActivity // Tarama animasyonu için ikon
} from 'react-icons/fi';

const TeacherAttendance = () => {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  
  // Kamera ve Yoklama State'leri
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0); 
  const [canStart, setCanStart] = useState(false); 
  const [timeMessage, setTimeMessage] = useState(''); 
  const [startTime, setStartTime] = useState(null); 
  
  // Öğrenci Listesi
  const [students, setStudents] = useState([]);
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isScanning, setIsScanning] = useState(false); // Tarama durumu
  
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const scanIntervalRef = useRef(null); // Python API döngüsü

  // Gün Haritaları
  const dayMap = { 
    0: 'Pazar', 1: 'Pazartesi', 2: 'Salı', 3: 'Çarşamba', 
    4: 'Perşembe', 5: 'Cuma', 6: 'Cumartesi' 
  };
  const dayReverseMap = { 
    'Pazar': 0, 'Pazartesi': 1, 'Salı': 2, 'Çarşamba': 3, 
    'Perşembe': 4, 'Cuma': 5, 'Cumartesi': 6 
  };

  useEffect(() => {
    fetchClasses();
    const interval = setInterval(() => {
        if (selectedClass) {
            checkTimeAvailability(selectedClass);
        }
    }, 60000);

    return () => {
      stopCamera();
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (selectedClass) {
      checkTimeAvailability(selectedClass);
      fetchClassStudents(selectedClass);
    }
  }, [selectedClass]);

  // Sayaç Mantığı
  useEffect(() => {
    if (isCameraActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleFinishAttendance(); 
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isCameraActive, timeLeft]);

  // --- API İŞLEMLERİ ---
  const fetchClasses = async () => {
    try {
      setLoading(true);
      const response = await teacherAPI.getMyClasses();
      const classList = response.data || [];
      setClasses(classList);
      if (classList.length > 0) setSelectedClass(classList[0].id);
    } catch (error) {
      console.error('Dersler yüklenemedi:', error);
      setError('Ders listesi yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const fetchClassStudents = async (classId) => {
    try {
        const response = await teacherAPI.getMyStudents();
        const allStudents = response.data || [];
        
        const classStudents = allStudents.filter(s => 
            s.classes && s.classes.some(c => c.id === parseInt(classId))
        ).map(s => ({
            ...s,
            status: 'absent', 
            statusText: 'Yok',
            timestamp: null
        }));

        setStudents(classStudents);
    } catch (error) {
        console.error('Öğrenciler yüklenemedi', error);
    }
  };

  // --- ZAMAN KONTROLÜ ---
  const findNextClassTime = (schedule) => {
    if (!schedule || schedule.length === 0) return null;
    const now = new Date();
    const currentDayIndex = now.getDay();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    let closestDate = null;
    let minDiff = Infinity;
    schedule.forEach(slot => {
        if (!slot.hour || !slot.day) return;
        const targetDayIndex = dayReverseMap[slot.day];
        const [startH, startM] = slot.hour.split('-')[0].split(':').map(Number);
        let targetDate = new Date();
        targetDate.setHours(startH, startM, 0, 0);
        let dayDiff = targetDayIndex - currentDayIndex;
        const targetMinutes = startH * 60 + startM;
        if (dayDiff < 0 || (dayDiff === 0 && targetMinutes < currentMinutes)) dayDiff += 7;
        targetDate.setDate(now.getDate() + dayDiff);
        const diff = targetDate - now;
        if (diff < minDiff) { minDiff = diff; closestDate = targetDate; }
    });
    return closestDate;
  };

  const checkTimeAvailability = (classId) => {
    const currentClass = classes.find(c => c.id === parseInt(classId));
    if (!currentClass) return;
    const now = new Date();
    const currentDayName = dayMap[now.getDay()];
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    let isTimeValid = false;
    let validSlot = null;
    let schedule = [];
    try {
        const rawSchedule = currentClass.weekly_schedule || currentClass.schedule;
        if (typeof rawSchedule === 'string') schedule = JSON.parse(rawSchedule);
        else if (Array.isArray(rawSchedule)) schedule = rawSchedule;
    } catch (e) { console.error(e); }

    for (const slot of schedule) {
        if (slot.day !== currentDayName || !slot.hour) continue;
        const [startH, startM] = slot.hour.split('-')[0].split(':').map(Number);
        const startTotalMinutes = startH * 60 + startM;
        if (currentMinutes >= (startTotalMinutes - 5) && currentMinutes <= (startTotalMinutes + 15)) {
            isTimeValid = true; validSlot = slot; break; 
        }
    }

    if (isTimeValid) {
        setCanStart(true);
        const typeText = validSlot.type === 'makeup' ? 'Make-up Dersi' : 'Normal Ders';
        setTimeMessage(`Aktif: ${typeText} (${validSlot.hour})`);
        setError('');
    } else {
        setCanStart(false);
        const nextDate = findNextClassTime(schedule);
        if (nextDate) {
            const openTime = new Date(nextDate.getTime() - 5 * 60000);
            const openStr = openTime.toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'});
            setTimeMessage(`Şu an ders yok. Kamera açılış: ${dayMap[nextDate.getDay()]} ${openStr} itibariyle.`);
        } else {
            setTimeMessage('Bu ders için planlanmış bir saat bulunamadı.');
        }
    }
  };

  // --- KAMERA VE PYTHON ENTEGRASYONU ---

  const startCamera = async () => {
    if (!selectedClass) return alert('Lütfen önce bir ders seçiniz.');
    if (!canStart) return alert('Ders saati gelmediği için kamera açılamaz.');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        setIsCameraActive(true);
        setStartTime(Date.now());
        setTimeLeft(15 * 60); 
        setError('');
        
        // Python Yüz Tanıma Döngüsünü Başlat
        startFaceRecognitionLoop();
      }
    } catch (err) {
      console.error("Kamera hatası:", err);
      setError('Kameraya erişilemedi.');
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
    setTimeLeft(0);
  };

  // --- PYTHON'A GÖRÜNTÜ GÖNDERME ---
  const startFaceRecognitionLoop = () => {
    // BURASI GÜNCELLENDİ: 1000ms (1 Saniye)
    scanIntervalRef.current = setInterval(async () => {
        if (!videoRef.current) return;

        // 1. Videodan kare yakala
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

        // 2. Blob'a çevir ve gönder
        canvas.toBlob(async (blob) => {
            if (!blob) return;

            const formData = new FormData();
            formData.append('file', blob, 'capture.jpg');

            try {
                setIsScanning(true); 
                
                // 3. Python API'ye gönder
                const response = await fetch('http://localhost:8000/recognize', {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    const result = await response.json();
                    
                    if (result.found_students && result.found_students.length > 0) {
                        markStudentsAsPresent(result.found_students);
                    }
                }
            } catch (err) {
                console.error("AI Servis Hatası (Python kapalı olabilir):", err);
            } finally {
                // Tarama ikonunu kısa süre sonra kapat
                setTimeout(() => setIsScanning(false), 500);
            }
        }, 'image/jpeg');

    }, 1000); // <-- 1 Saniyeye düşürüldü
  };

  const markStudentsAsPresent = (studentNumbers) => {
    setStudents(prevStudents => {
        let hasChanges = false;
        const updated = prevStudents.map(student => {
            // --- KRİTİK DÜZELTME: Veri tipi dönüşümü ---
            // Gelen numara ve listedeki numarayı kesinlikle String'e çeviriyoruz.
            const currentStudentNum = String(student.student_number);
            
            // studentNumbers array'indeki değerleri de kontrol edelim
            const isMatch = studentNumbers.some(num => String(num) === currentStudentNum);

            if (isMatch && student.status === 'absent') {
                hasChanges = true;
                return { 
                    ...student, 
                    status: 'present', 
                    statusText: 'Derste',
                    timestamp: new Date().toLocaleTimeString()
                };
            }
            return student;
        });
        
        return hasChanges ? updated : prevStudents;
    });
  };

  const handleFinishAttendance = async () => {
    if (!isCameraActive && !startTime) return;

    stopCamera();
    setIsSaving(true);

    const durationSeconds = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
    const durationMinutes = Math.ceil(durationSeconds / 60);

    const payload = {
        class_id: selectedClass,
        duration_minutes: durationMinutes > 0 ? durationMinutes : 1,
        students: students.map(s => ({
            student_id: s.id,
            status: s.status
        }))
    };

    try {
        await teacherAPI.submitAttendance(payload);
        alert('Yoklama başarıyla kaydedildi!');
        setStartTime(null);
    } catch (err) {
        console.error(err);
        alert('Kaydedilirken hata oluştu: ' + (err.response?.data?.message || err.message));
    } finally {
        setIsSaving(false);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div>
      <Header title="Yoklama Başlat" />

      {loading ? (
        <div className="spinner" style={{textAlign:'center', marginTop:'50px', color:'#cbd5e1'}}>Yükleniyor...</div>
      ) : (
        <>
            {/* ÜST BÖLÜM: Ders Seçimi */}
            <div className="card" style={{marginTop: '30px', marginBottom: '20px', padding:'20px'}}>
                <div style={{width: '100%'}}>
                    <label style={{display:'block', marginBottom:'8px', color:'var(--ai-cyan)', fontWeight:'bold'}}>
                        Ders Seçimi
                    </label>
                    <select 
                        value={selectedClass} 
                        onChange={(e) => {
                            setSelectedClass(e.target.value);
                            stopCamera();
                        }}
                        style={{
                            width: '100%', padding: '12px', borderRadius: '8px',
                            backgroundColor: 'var(--ai-darkest)', color: '#fff', 
                            border: '1px solid var(--ai-mid)', fontSize: '1rem'
                        }}
                    >
                        {classes.length === 0 && <option value="">Atanmış ders bulunamadı</option>}
                        {classes.map(cls => (
                            <option key={cls.id} value={cls.id}>
                                {cls.class_name} ({cls.class_code})
                            </option>
                        ))}
                    </select>
                </div>
                
                {error && !error.includes('Kamera') && (
                    <div style={{color:'#ef4444', marginTop:'10px', display:'flex', alignItems:'center', gap:'10px'}}>
                        <FiAlertCircle size={20}/> <span>{error}</span>
                    </div>
                )}
            </div>

            {/* ANA ALAN: KAMERA (%70) VE QR (%30) */}
            <div style={{
                display: 'grid', 
                gridTemplateColumns: '7fr 3fr', 
                gap: '20px',
                marginBottom: '20px',
                height: '600px'
            }}>
                
                {/* SOL PANEL: KAMERA ALANI */}
                <div className="card" style={{
                    margin: 0, padding: 0, overflow: 'hidden', 
                    display: 'flex', flexDirection: 'column',
                    position: 'relative', 
                    height: '100%'
                }}>
                    <div style={{
                        padding: '15px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        backgroundColor: 'rgba(0,0,0,0.2)',
                        flexShrink: 0
                    }}>
                        <div style={{display:'flex', alignItems:'center', gap:'10px', color:'var(--ai-cyan)', fontWeight:'bold'}}>
                            <FiVideo /> Kamera
                            {isScanning && <span style={{fontSize:'0.8rem', color:'#10b981', display:'flex', alignItems:'center', gap:'5px'}}><FiActivity className="spin"/> Taranıyor...</span>}
                        </div>
                        {isCameraActive && (
                            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                                <div style={{
                                    color:'#ef4444', fontWeight:'bold', fontSize: '0.85rem', 
                                    display:'flex', alignItems:'center', gap:'4px'
                                }}>
                                    <FiClock /> {formatTime(timeLeft)}
                                </div>
                                <span style={{
                                    width:'8px', height:'8px', borderRadius:'50%', 
                                    backgroundColor:'#ef4444', animation:'pulse 1.5s infinite'
                                }}></span>
                            </div>
                        )}
                    </div>

                    <div style={{
                        flex: 1, 
                        backgroundColor: '#000', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        <video 
                            ref={videoRef} 
                            autoPlay 
                            playsInline 
                            muted 
                            style={{
                                width: '100%', 
                                height: '100%', 
                                objectFit: 'cover', 
                                display: isCameraActive ? 'block' : 'none',
                                transform: 'scaleX(-1)'
                            }} 
                        />

                        {!isCameraActive && (
                            <div style={{textAlign: 'center', color: '#64748b', position: 'absolute'}}>
                                <FiCamera size={64} style={{marginBottom: '20px', opacity: 0.5}} />
                                <p>Kamera şu an kapalı.</p>
                            </div>
                        )}

                        {isCameraActive && (
                            <div style={{
                                position: 'absolute', top: '15%', left: '15%', width: '70%', height: '70%',
                                border: `2px dashed ${isScanning ? '#10b981' : 'rgba(3, 201, 248, 0.5)'}`, 
                                borderRadius: '20px',
                                pointerEvents: 'none', boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
                                transition: 'border-color 0.3s'
                            }}>
                                <div style={{position:'absolute', top:'-30px', left:'50%', transform:'translateX(-50%)', color:'rgba(3, 201, 248, 0.8)', fontSize:'0.8rem'}}>
                                    Yüz Algılama Alanı
                                </div>
                            </div>
                        )}
                    </div>

                    <div style={{
                        padding: '15px 20px', 
                        borderTop: '1px solid rgba(255,255,255,0.1)', 
                        display: 'flex', 
                        justifyContent: 'flex-start',
                        alignItems: 'center',
                        backgroundColor: 'var(--ai-dark)',
                        flexShrink: 0,
                        gap: '20px'
                    }}>
                        {!isCameraActive ? (
                            <>
                                <Button 
                                    onClick={startCamera} 
                                    variant="primary" 
                                    icon={<FiCamera />} 
                                    disabled={!canStart} 
                                    style={{minWidth: '150px'}}
                                >
                                    Başlat
                                </Button>
                                <div style={{color: canStart ? 'var(--ai-blue)' : '#ef4444', fontSize: '0.9rem', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '8px'}}>
                                    {canStart ? <FiCheckCircle /> : <FiClock />} {timeMessage}
                                </div>
                            </>
                        ) : (
                            <Button 
                                onClick={handleFinishAttendance} 
                                variant="danger" 
                                icon={<FiStopCircle />} 
                                disabled={isSaving}
                                style={{minWidth: '150px'}}
                            >
                                {isSaving ? 'Kaydediliyor...' : 'Bitir ve Kaydet'}
                            </Button>
                        )}
                    </div>
                </div>

                {/* SAĞ PANEL: QR KOD */}
                <div className="card" style={{
                    margin: 0, padding: 0, 
                    display: 'flex', flexDirection: 'column',
                    backgroundColor: 'var(--ai-darkest)',
                    border: '1px dashed var(--ai-mid)',
                    height: '100%'
                }}>
                    <div style={{
                        padding: '15px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)',
                        display: 'flex', alignItems: 'center', gap:'10px',
                        color: '#94a3b8', fontWeight:'bold', flexShrink: 0
                    }}>
                        <FiGrid /> Alternatif Yöntem
                    </div>
                    <div style={{
                        flex: 1, display: 'flex', flexDirection: 'column', 
                        alignItems: 'center', justifyContent: 'center', 
                        padding: '30px', textAlign: 'center', opacity: 0.6
                    }}>
                        <div style={{
                            width: '200px', height: '200px', 
                            border: '4px solid #334155', borderRadius: '12px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            marginBottom: '20px',
                            background: 'linear-gradient(45deg, transparent 48%, #334155 49%, #334155 51%, transparent 52%)'
                        }}>
                            <span style={{fontSize:'4rem', color:'#334155'}}>QR</span>
                        </div>
                        <h3 style={{color: '#fff', fontSize: '1.4rem', marginBottom: '10px'}}>QR Kod</h3>
                        <p style={{color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.5'}}>Mobil uygulama ile okutulabilir.</p>
                    </div>
                </div>
            </div>

            {/* --- LİSTE --- */}
            <div className="card" style={{marginTop: '20px'}}>
                <div style={{padding: '15px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)', display:'flex', justifyContent:'space-between'}}>
                    <h3 style={{fontSize:'1.1rem', color:'var(--ai-cyan)', margin:0}}>
                        <FiUserCheck style={{marginRight:'8px', verticalAlign:'middle'}}/>
                        Sınıf Listesi ve Katılım Durumu
                    </h3>
                    <div style={{fontSize:'0.9rem', color:'#cbd5e1'}}>
                        Toplam: <strong style={{color:'#fff'}}>{students.length}</strong> | 
                        Derste: <strong style={{color:'#10b981'}}>{students.filter(s => s.status === 'present').length}</strong>
                    </div>
                </div>
                
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th style={{width:'50px'}}>#</th>
                                <th>Öğrenci No</th>
                                <th>Ad Soyad</th>
                                <th>Giriş Saati</th>
                                <th style={{textAlign:'center'}}>Durum</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.length === 0 ? (
                                <tr><td colSpan="5" style={{textAlign:'center', padding:'20px', color:'#999'}}>Ders listesi yükleniyor veya boş.</td></tr>
                            ) : (
                                students.map((std, index) => (
                                    <tr key={std.id} style={{backgroundColor: std.status === 'present' ? 'rgba(16, 185, 129, 0.05)' : 'transparent'}}>
                                        <td style={{color:'#64748b'}}>{index + 1}</td>
                                        <td style={{fontWeight:'bold', color:'#fff'}}>{std.student_number}</td>
                                        <td>{std.first_name} {std.last_name}</td>
                                        <td>{std.timestamp || '-'}</td>
                                        <td style={{textAlign:'center'}}>
                                            {std.status === 'present' ? (
                                                <span style={{
                                                    backgroundColor: '#10b981', color: '#fff', 
                                                    padding: '4px 12px', borderRadius: '20px', 
                                                    fontSize: '0.85rem', fontWeight: 'bold',
                                                    display: 'inline-flex', alignItems: 'center', gap: '5px'
                                                }}>
                                                    <FiCheckCircle /> DERSTE
                                                </span>
                                            ) : (
                                                <span style={{
                                                    backgroundColor: '#ef4444', color: '#fff', 
                                                    padding: '4px 12px', borderRadius: '20px', 
                                                    fontSize: '0.85rem', fontWeight: 'bold',
                                                    display: 'inline-flex', alignItems: 'center', gap: '5px'
                                                }}>
                                                    <FiUserX /> YOK
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <style>{`
                @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { 100% { transform: rotate(360deg); } }
            `}</style>
        </>
      )}
    </div>
  );
};

export default TeacherAttendance;
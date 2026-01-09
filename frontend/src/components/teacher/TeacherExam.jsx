import React, { useState, useEffect, useRef } from 'react';
import { teacherAPI } from '../../services/api';
import { FiCamera, FiStopCircle, FiCheckCircle, FiXCircle, FiCpu, FiAlertTriangle, FiUserCheck, FiMapPin, FiRefreshCw } from 'react-icons/fi';
import '../admin/AdminHome.css';

const TeacherExam = () => {
  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [examData, setExamData] = useState(null); 
  const [studentsStatus, setStudentsStatus] = useState({}); 
  const [wrongSeatAlerts, setWrongSeatAlerts] = useState({}); 
  
  const [debugLog, setDebugLog] = useState("Sistem Hazır.");

  const isCameraActiveRef = useRef(false);
  const [isCameraActiveState, setIsCameraActiveState] = useState(false);

  const videoRef = useRef(null); 
  const streamRef = useRef(null); 
  const intervalRef = useRef(null); 
  const examDataRef = useRef(null);

  useEffect(() => {
    examDataRef.current = examData;
    if (examData) setDebugLog(`Veri Hazır: ${examData.seating.length} öğrenci.`);
  }, [examData]);

  useEffect(() => {
    fetchExams();
  }, []);

  useEffect(() => {
    if (selectedExamId) {
      fetchExamDetails(selectedExamId);
    } else {
      setExamData(null);
      setStudentsStatus({});
      setWrongSeatAlerts({});
      stopCamera(); 
    }
  }, [selectedExamId]);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const fetchExams = async () => {
    try {
      const res = await teacherAPI.getMyExams();
      setExams(res.data || []);
    } catch (error) {
      console.error("Sınavlar yüklenemedi", error);
    }
  };

  const fetchExamDetails = async (id) => {
    try {
      const res = await teacherAPI.getExamDetails(id);
      setExamData(res.data);
      const initialStatus = {};
      if (res.data.seating) {
        res.data.seating.forEach(s => {
          initialStatus[s.student_id] = 'absent';
        });
      }
      setStudentsStatus(initialStatus);
    } catch (error) {
      console.error("Sınav detayı yüklenemedi", error);
    }
  };

  const startCamera = async () => {
    if (!examDataRef.current) {
        alert("Önce sınav seçiniz!");
        return;
    }

    try {
      setDebugLog("Kamera açılıyor...");
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      isCameraActiveRef.current = true;
      setIsCameraActiveState(true);
      setDebugLog("AI Tarama Başlatıldı...");
      
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(captureAndCheck, 1000);

    } catch (err) {
      setDebugLog("Kamera Hatası: " + err.message);
      alert("Kamera hatası: " + err.message);
    }
  };

  const stopCamera = () => {
    isCameraActiveRef.current = false;
    setIsCameraActiveState(false);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    if (intervalRef.current) clearInterval(intervalRef.current);
    
    setDebugLog("Kamera Durduruldu.");
  };

  const captureAndCheck = async () => {
    if (!videoRef.current || !isCameraActiveRef.current || videoRef.current.readyState < 2) return;

    try {
        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);

        canvas.toBlob(async (blob) => {
          if (!blob) return;
          const formData = new FormData();
          formData.append('file', blob, 'capture.jpg'); 

          try {
            const res = await teacherAPI.checkExamPresence(formData);
            const responseData = res.data || res;
            const detections = responseData.detections || [];
            
            const foundNumbers = [];
            const newWrongSeats = {};
            const detectedObjects = []; 

            if (detections.length > 0) {
                detections.forEach(det => {
                    const num = det.student_number;
                    const loc = det.location; // [top, right, bottom, left]
                    foundNumbers.push(num);

                    if (loc) {
                        const centerY = (loc[0] + loc[2]) / 2;
                        const centerX = (loc[3] + loc[1]) / 2; 
                        
                        const studentInfo = examDataRef.current?.seating.find(s => String(s.student_number).trim() === String(num).trim());
                        
                        if (studentInfo) {
                            detectedObjects.push({
                                ...studentInfo,
                                currentX: centerX, // Ekrandaki yatay konumu
                                currentY: centerY, // Ekrandaki dikey konumu (Sıra kontrolü için)
                                seatNum: parseInt(studentInfo.seat_number),
                                studentId: studentInfo.student_id
                            });
                        }
                    }
                });

                // --- GÖRELİ KONUM KONTROLÜ (RELATIVE CHECK) ---
                // 1. Önce Sıra Numarasına göre beklenen sıraya dizelim (1, 2, 3...)
                // Not: Sadece ekranda görünenleri kıyaslayabiliriz.
                detectedObjects.sort((a, b) => a.seatNum - b.seatNum);

                for (let i = 0; i < detectedObjects.length - 1; i++) {
                    const studentA = detectedObjects[i];     // Beklenen: Sol (Küçük Numara)
                    const studentB = detectedObjects[i + 1]; // Beklenen: Sağ (Büyük Numara)

                    // Yükseklik Farkı Kontrolü (Farklı sıralardaysa kıyaslama yapma)
                    // Y farkı çok fazlaysa biri ön sırada biri arka sırada demektir.
                    const yDiff = Math.abs(studentA.currentY - studentB.currentY);
                    if (yDiff > 100) continue; // Aynı hizada değillerse geç

                    // Sağ-Sol Kontrolü
                    // Beklenti: Seat A < Seat B  ==>  X_A < X_B (A, B'nin solunda olmalı)
                    // HATA DURUMU: Eğer A'nın X'i, B'nin X'inden büyükse, A sağa geçmiş demektir.
                    
                    if (studentA.currentX > studentB.currentX) {
                        // HATA TESPİT EDİLDİ
                        const msg = "Yer Değişikliği!";
                        newWrongSeats[studentA.studentId] = msg;
                        newWrongSeats[studentB.studentId] = msg;
                        console.warn(`UYARI: ${studentA.first_name} ve ${studentB.first_name} ters oturmuş!`);
                    }
                }
            }

            setWrongSeatAlerts(newWrongSeats);
            
            const time = new Date().toLocaleTimeString();
            if (foundNumbers.length > 0) {
                setDebugLog(`✅ [${time}] Analiz: ${foundNumbers.length} kişi`);
                updateAttendance(foundNumbers);
            } else {
                setDebugLog(`👀 [${time}] Taranıyor...`);
            }

          } catch (error) {
             // setDebugLog("Sunucu Hatası");
          }
        }, 'image/jpeg', 0.8);

    } catch (e) {
        console.error("Capture hatası:", e);
    }
  };

  const updateAttendance = (foundNumbers) => {
    const currentData = examDataRef.current;
    if (!currentData || !currentData.seating) return;

    setStudentsStatus(prev => {
      const newStatus = { ...prev };
      let somethingChanged = false;

      foundNumbers.forEach(num => {
        const numStr = String(num).trim();
        const student = currentData.seating.find(s => String(s.student_number).trim() === numStr);
        
        if (student) {
            if (newStatus[student.student_id] !== 'present') {
                newStatus[student.student_id] = 'present';
                somethingChanged = true;
            }
        }
      });
      return somethingChanged ? newStatus : prev;
    });
  };

  // --- STİLLER ---
  const getSeatColor = (student) => {
    if (!student) return '#111'; 
    
    // HATA VARSA KIRMIZI
    if (wrongSeatAlerts[student.student_id]) return 'rgba(255, 0, 0, 0.5)';
    
    // YOKLAMA TAMAMSA YEŞİL
    const status = studentsStatus[student.student_id];
    return status === 'present' ? 'rgba(0, 255, 157, 0.4)' : '#222'; 
  };
  
  const getSeatBorder = (student) => {
    if (!student) return '1px solid #333';
    
    // HATA VARSA KIRMIZI ÇERÇEVE
    if (wrongSeatAlerts[student.student_id]) return '2px solid #ff0000';
    
    const status = studentsStatus[student.student_id];
    return status === 'present' ? '2px solid #00ff9d' : '1px solid #444';
  };

  return (
    <div className="admin-page-container">
      <div className="admin-header">
        <h1>Sınav & Gözetim Paneli</h1>
      </div>

      <div className="card mb-4" style={{borderLeft: '4px solid var(--ai-blue)'}}>
        <label style={{color: 'var(--ai-cyan)', marginBottom:'5px', display:'block', fontWeight:'bold'}}>
          <FiAlertTriangle style={{marginRight:'5px'}}/> Gözetim Yapılacak Sınavı Seçin:
        </label>
        <select 
          className="form-control" 
          style={{width: '100%', padding:'12px', backgroundColor:'#111', color:'#fff', border:'1px solid #333', borderRadius:'4px'}}
          onChange={(e) => setSelectedExamId(e.target.value)}
          value={selectedExamId}
        >
          <option value="">-- Sınav Seçiniz --</option>
          {exams.map(e => (
            <option key={e.id} value={e.id}>
              {e.exam_name} - {e.class_name} ( {e.exam_date} | {e.exam_time} )
            </option>
          ))}
        </select>
      </div>

      {selectedExamId && examData && (
        <>
          <div className="card mb-4" style={{
            padding: '0', overflow:'hidden', position:'relative', height:'500px', backgroundColor:'#000', 
            border: isCameraActiveState ? '2px solid var(--ai-cyan)' : '1px solid #333',
            boxShadow: isCameraActiveState ? '0 0 20px rgba(0, 255, 255, 0.2)' : 'none'
          }}>
            <video 
              ref={videoRef} autoPlay playsInline muted
              style={{
                  width:'100%', 
                  height:'100%', 
                  objectFit:'cover', 
                  display: isCameraActiveState ? 'block' : 'none',
                  transform: 'scaleX(-1)'
              }} 
            />

            {!isCameraActiveState && (
              <div className="flex flex-col items-center justify-center h-full" style={{padding:'50px'}}>
                <FiCamera size={80} color="#333" />
                <p className="text-muted mt-3" style={{fontSize:'1.2rem'}}>Kamera Kapalı</p>
                <p className="text-muted small">Sınav gözetimini başlatmak için aşağıdaki butona basın.</p>
              </div>
            )}
            
            {isCameraActiveState && (
                <div style={{
                    position: 'absolute', top: 20, left: 20, 
                    backgroundColor: 'rgba(0,0,0,0.8)', color: '#00ff9d', 
                    padding: '10px 15px', borderRadius: '5px', zIndex: 100, 
                    fontSize: '14px', fontFamily: 'monospace', border: '1px solid #00ff9d'
                }}>
                    LOG: {debugLog}
                </div>
            )}

            <div style={{
              position:'absolute', bottom:'0', left:'0', width:'100%', 
              background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)',
              padding:'20px', display:'flex', justifyContent:'center', alignItems:'center'
            }}>
              {!isCameraActiveState ? (
                <button className="btn btn-success" onClick={startCamera} style={{padding:'12px 40px', fontSize:'18px', borderRadius:'30px'}}>
                  <FiCamera style={{marginRight:'10px'}} /> Gözetimi Başlat
                </button>
              ) : (
                <div className="flex gap-4 items-center">
                   <div style={{color:'#0f0', display:'flex', alignItems:'center', backgroundColor:'rgba(0,0,0,0.5)', padding:'5px 15px', borderRadius:'20px'}}>
                      <FiCpu className="spin-icon" style={{marginRight:'8px'}}/> AI Analizi Aktif
                   </div>
                   <button className="btn btn-danger" onClick={stopCamera} style={{padding:'12px 40px', fontSize:'18px', borderRadius:'30px'}}>
                    <FiStopCircle style={{marginRight:'10px'}} /> Bitir
                  </button>
                </div>
              )}
            </div>
          </div>

          <div style={{display: 'grid', gridTemplateColumns: '350px 1fr', gap: '20px', alignItems:'start'}}>
            <div className="card" style={{maxHeight:'600px', overflowY:'auto', padding:'0'}}>
              <div style={{padding:'15px', borderBottom:'1px solid #333', position:'sticky', top:0, background:'var(--ai-dark)', zIndex:10}}>
                <h3 style={{margin:0, fontSize:'1.1rem', display:'flex', alignItems:'center'}}>
                   <FiUserCheck style={{marginRight:'8px'}}/> Katılım Listesi
                </h3>
              </div>
              <table style={{width:'100%', fontSize:'13px', borderCollapse:'collapse'}}>
                <thead style={{position:'sticky', top:'50px', background:'#1a1a1a'}}>
                  <tr style={{textAlign:'left', color:'#aaa', borderBottom:'1px solid #333'}}>
                    <th style={{padding:'10px'}}>No</th>
                    <th>Öğrenci</th>
                    <th style={{textAlign:'center'}}>Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {examData.seating && examData.seating.map(s => (
                    <tr key={s.student_id} style={{borderBottom:'1px solid #222', backgroundColor: studentsStatus[s.student_id] === 'present' ? 'rgba(0,255,0,0.1)' : 'transparent'}}>
                      <td style={{padding:'10px', fontFamily:'monospace', color:'var(--ai-cyan)'}}>{s.student_number}</td>
                      <td>
                        {s.first_name} {s.last_name}
                        {/* HATA VARSA LİSTEDE DE GÖSTER */}
                        {wrongSeatAlerts[s.student_id] && 
                            <span style={{color:'red', display:'block', fontSize:'9px', fontWeight:'bold'}}>
                                <FiMapPin style={{marginRight:'2px'}}/> YANLIŞ YER!
                            </span>
                        }
                      </td>
                      <td style={{padding:'10px', textAlign:'center'}}>
                        {studentsStatus[s.student_id] === 'present' ? (
                          <FiCheckCircle color="#00ff9d" size={20} />
                        ) : (
                          <FiXCircle color="#555" size={20} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="card" style={{backgroundColor:'#000', minHeight:'600px'}}>
               <div className="flex justify-between items-center mb-4 pb-2" style={{borderBottom:'1px solid #333'}}>
                  <h3 style={{margin:0}}>Sınıf Oturma Düzeni ({examData.exam?.classroom})</h3>
                  <div style={{fontSize:'12px', color:'#777'}}>60 Kişilik Derslik</div>
               </div>
               <div style={{
                  width:'50%', margin:'0 auto 30px auto', height:'40px', backgroundColor:'#111', 
                  borderRadius:'0 0 15px 15px', display:'flex', alignItems:'center', justifyContent:'center', 
                  border:'1px solid #333', borderTop:'none', color:'#444', fontSize:'14px', letterSpacing:'3px', fontWeight:'bold',
                  boxShadow:'0 10px 20px -10px rgba(0,0,0,1)'
               }}>
                  TAHTA / KÜRSÜ
               </div>
               <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(6, 1fr)', 
                  gap: '12px',
                  padding: '10px'
               }}>
                  {Array.from({ length: 60 }, (_, i) => i + 1).map(seatNum => {
                     const student = examData.seating ? examData.seating.find(s => parseInt(s.seat_number) === seatNum) : null;
                     const isPresent = student && studentsStatus[student.student_id] === 'present';
                     return (
                        <div key={seatNum} style={{
                           height: '60px',
                           backgroundColor: getSeatColor(student),
                           border: getSeatBorder(student),
                           borderRadius: '8px',
                           display: 'flex',
                           flexDirection: 'column',
                           alignItems: 'center',
                           justifyContent: 'center',
                           fontSize: '10px',
                           color: '#fff',
                           position: 'relative',
                           transition: 'all 0.3s ease',
                           boxShadow: isPresent ? '0 0 15px rgba(0,255,157,0.4)' : 'none',
                           transform: isPresent ? 'scale(1.05)' : 'scale(1)',
                           zIndex: isPresent ? 2 : 1
                        }}>
                           <span style={{position:'absolute', top:2, left:4, opacity:0.3, fontSize:'8px'}}>{seatNum}</span>
                           {student ? (
                              <>
                                <span style={{fontWeight:'bold', textAlign:'center', color: isPresent ? '#fff' : '#888'}}>
                                  {student.first_name} {student.last_name.charAt(0)}.
                                </span>
                                <span style={{fontSize:'8px', opacity:0.6, marginTop:'2px', fontFamily:'monospace'}}>{student.student_number}</span>
                              </>
                           ) : (
                              <span style={{opacity:0.1}}>-</span>
                           )}
                        </div>
                     );
                  })}
               </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TeacherExam;
import React, { useState, useEffect } from 'react';
import { teacherAPI } from '../../services/api';
import Header from '../common/Header';
import Button from '../common/Button';
import { FiSend, FiMessageSquare, FiClock, FiCheck, FiXCircle } from 'react-icons/fi';

const TeacherFeedback = () => {
  const [feedback, setFeedback] = useState({ subject: '', message: '', type: 'feedback' });
  const [loading, setLoading] = useState(false);
  // Geçmiş mesajları tutacak state
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await teacherAPI.getSentFeedbacks();
      setHistory(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Geçmiş mesajlar alınamadı", error);
    }
  };

  const handleSendFeedback = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await teacherAPI.sendFeedback(feedback);
      alert('Mesajınız yöneticiye başarıyla iletildi.');
      setFeedback({ subject: '', message: '', type: 'feedback' });
      // Gönderdikten sonra listeyi yenile
      fetchHistory();
    } catch (error) {
      alert('Gönderim başarısız: ' + (error.message || 'Bilinmeyen hata'));
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  // Kart Stili
  const cardStyle = {
    backgroundColor: 'var(--ai-dark)',
    border: '1px solid var(--ai-mid)',
    padding: '30px',
    borderRadius: '12px',
    color: '#fff',
    // maxWidth: '800px', // --- BU SATIR KALDIRILDI (Genişlik kısıtlaması iptal) ---
    margin: '30px auto'
  };

  return (
    <div>
      <Header title="Yöneticiye Mesaj Gönder" />

      {/* Mesaj Gönderme Formu */}
      <div style={cardStyle}>
        <h3 style={{color: 'var(--ai-cyan)', borderBottom: '1px solid var(--ai-mid)', paddingBottom: '15px', marginBottom: '25px', display:'flex', alignItems:'center', gap:'10px'}}>
          <FiMessageSquare /> Yeni Mesaj Oluştur
        </h3>
        
        <form onSubmit={handleSendFeedback}>
          <div className="input-group">
            <label>Konu Başlığı</label>
            <input
              type="text"
              value={feedback.subject}
              onChange={(e) => setFeedback({...feedback, subject: e.target.value})}
              placeholder="Mesajınızın konusu..."
              required
              style={{backgroundColor: 'rgba(0,0,0,0.3)', color:'#fff', border:'1px solid var(--ai-mid)'}}
            />
          </div>

          <div className="input-group">
            <label>Mesaj İçeriği</label>
            <textarea
              value={feedback.message}
              onChange={(e) => setFeedback({...feedback, message: e.target.value})}
              rows="6"
              placeholder="Yöneticiye iletmek istediğiniz mesajı buraya yazın..."
              required
              style={{backgroundColor: 'rgba(0,0,0,0.3)', color:'#fff', border:'1px solid var(--ai-mid)'}}
            />
          </div>

          <div className="input-group">
            <label>Mesaj Türü</label>
            <select
              value={feedback.type}
              onChange={(e) => setFeedback({...feedback, type: e.target.value})}
              style={{backgroundColor: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid var(--ai-mid)'}}
            >
              <option value="feedback">Geri Bildirim</option>
              <option value="complaint">Şikayet / Sorun Bildirimi</option>
              <option value="request">İstek / Talep</option>
            </select>
          </div>

          <div style={{marginTop: '30px', display:'flex', justifyContent:'flex-end'}}>
            <Button type="submit" variant="primary" disabled={loading} icon={<FiSend />}>
              {loading ? 'Gönderiliyor...' : 'Mesajı Gönder'}
            </Button>
          </div>
        </form>
      </div>

      {/* Mesaj Geçmişi */}
      <div style={{...cardStyle, marginTop: '40px'}}>
        <h3 style={{color: 'var(--ai-cyan)', borderBottom: '1px solid var(--ai-mid)', paddingBottom: '15px', marginBottom: '20px', display:'flex', alignItems:'center', gap:'10px'}}>
          <FiClock /> Son Gönderilenler (Son 30 Gün)
        </h3>

        {history.length === 0 ? (
            <div style={{textAlign:'center', color:'#cbd5e1', fontStyle:'italic', padding:'20px'}}>
                Henüz gönderilen mesaj bulunmuyor.
            </div>
        ) : (
            <div style={{display:'flex', flexDirection:'column', gap:'15px'}}>
                {history.map(msg => (
                    <div key={msg.id} style={{
                        backgroundColor: 'rgba(255,255,255,0.03)', 
                        border: '1px solid var(--ai-mid)',
                        borderRadius: '8px',
                        padding: '15px'
                    }}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'10px'}}>
                            <div>
                                <span style={{
                                    backgroundColor: 'rgba(3, 201, 248, 0.1)', color: 'var(--ai-cyan)', 
                                    padding: '2px 8px', borderRadius: '4px', fontSize: '0.8em', marginRight:'10px',
                                    textTransform: 'uppercase', fontWeight:'bold'
                                }}>
                                    {msg.type}
                                </span>
                                <span style={{color:'#fff', fontWeight:'600'}}>{msg.subject}</span>
                            </div>
                            <span style={{color:'#94a3b8', fontSize:'0.85em'}}>{formatDate(msg.created_at)}</span>
                        </div>
                        
                        <p style={{color:'#cbd5e1', fontSize:'0.95em', lineHeight:'1.5', margin:'0 0 10px 0', whiteSpace:'pre-wrap'}}>
                            {msg.message}
                        </p>

                        <div style={{
                            fontSize:'0.85em', 
                            display:'flex', alignItems:'center', gap:'5px',
                            color: msg.is_read == 1 ? '#10b981' : '#f59e0b'
                        }}>
                            {msg.is_read == 1 ? (
                                <><FiCheck /> Yönetici tarafından okundu</>
                            ) : (
                                <><FiXCircle /> Henüz okunmadı</>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
};

export default TeacherFeedback;
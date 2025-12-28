import React from 'react';
import { adminAPI } from '../../services/api';
import { FiDownload } from 'react-icons/fi';
import * as XLSX from 'xlsx';
import Header from '../common/Header';
import Button from '../common/Button';

const AdminExport = () => {
  const handleExport = async (type) => {
    try {
      const response = await adminAPI.exportData(type);
      const data = response.data;
      
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, type);
      
      const fileName = `${type}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      alert('Dosya başarıyla indirildi!');
    } catch (error) {
      alert('İndirme sırasında bir hata oluştu');
    }
  };

  // Kartlar için ortak stil objesi (Koyu Tema)
  const cardStyle = {
    backgroundColor: 'var(--ai-dark)', // Koyu Lacivert
    border: '1px solid var(--ai-mid)', // Neon Kenarlık
    color: '#fff',
    padding: '30px',
    borderRadius: '12px',
    textAlign: 'center',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
  };

  const titleStyle = {
    color: 'var(--ai-cyan)',
    marginBottom: '15px',
    fontWeight: '700'
  };

  const textStyle = {
    color: '#cbd5e1', // Soluk gri-mavi
    marginBottom: '20px'
  };

  return (
    <div>
      <Header title="Dışa Aktar" />
      
      <div className="dashboard-grid">
        
        {/* ÖĞRENCİLER KARTI */}
        <div style={cardStyle}>
          <h3 style={titleStyle}>Öğrenciler</h3>
          <p style={textStyle}>Tüm öğrenci bilgilerini Excel dosyası olarak indir</p>
          <Button onClick={() => handleExport('students')} icon={<FiDownload />} variant="primary">
            Öğrencileri İndir
          </Button>
        </div>

        {/* ÖĞRETMENLER KARTI */}
        <div style={cardStyle}>
          <h3 style={titleStyle}>Öğretmenler</h3>
          <p style={textStyle}>Tüm öğretmen bilgilerini Excel dosyası olarak indir</p>
          <Button onClick={() => handleExport('teachers')} icon={<FiDownload />} variant="primary">
            Öğretmenleri İndir
          </Button>
        </div>

        {/* DERSLER KARTI */}
        <div style={cardStyle}>
          <h3 style={titleStyle}>Dersler</h3>
          <p style={textStyle}>Tüm ders bilgilerini Excel dosyası olarak indir</p>
          <Button onClick={() => handleExport('classes')} icon={<FiDownload />} variant="primary">
            Dersleri İndir
          </Button>
        </div>

      </div>
    </div>
  );
};

export default AdminExport;
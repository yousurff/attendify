import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from '../components/common/Sidebar';
import TeacherProfile from '../components/teacher/TeacherProfile';
import TeacherAttendance from '../components/teacher/TeacherAttendance';
import TeacherClass from '../components/teacher/TeacherClass';
import TeacherStudent from '../components/teacher/TeacherStudent';
import TeacherFeedback from '../components/teacher/TeacherFeedback'; // YENİ IMPORT
import './TeacherPage.css';

const TeacherPage = () => {
  // Sidebar'ın açık/kapalı durumunu burada yönetiyoruz
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="teacher-layout">
      {/* Sidebar'a durumu ve değiştirme fonksiyonunu gönderiyoruz */}
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      
      {/* İçeriğin margin'ini sidebar durumuna göre CSS ile ayarlayacağız */}
      <main className={`teacher-content ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <Routes>
          <Route path="/" element={<Navigate to="/teacher/attendance" replace />} />
          <Route path="/profile" element={<TeacherProfile />} />
          <Route path="/attendance" element={<TeacherAttendance />} />
          <Route path="/classes" element={<TeacherClass />} />
          <Route path="/students" element={<TeacherStudent />} />
          {/* YENİ ROTA EKLENDİ */}
          <Route path="/feedback" element={<TeacherFeedback />} />
        </Routes>
      </main>
    </div>
  );
};

export default TeacherPage;
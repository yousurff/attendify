// frontend/src/pages/AdminPage.jsx
import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from '../components/common/Sidebar';
import AdminHome from '../components/admin/AdminHome';
import AdminTeacher from '../components/admin/AdminTeacher';
import AdminStudent from '../components/admin/AdminStudent';
import AdminClass from '../components/admin/AdminClass';
import AdminExport from '../components/admin/AdminExport';
import AdminAttendance from '../components/admin/AdminAttendance';
import AdminSettings from '../components/admin/AdminSettings';
import './AdminPage.css';

const AdminPage = () => {
  // Menü açık mı kapalı mı state'i (Varsayılan: false yani kapalı/ince şerit)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="admin-layout">
      {/* Sidebar'a durumu ve değiştirme fonksiyonunu gönderiyoruz */}
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

      {/* İçerik alanı menünün durumuna göre sınıf alıyor */}
      <div className={`admin-main ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <Routes>
          <Route path="/" element={<Navigate to="/admin/home" replace />} />
          <Route path="/home" element={<AdminHome />} />
          <Route path="/teachers" element={<AdminTeacher />} />
          <Route path="/students" element={<AdminStudent />} />
          <Route path="/classes" element={<AdminClass />} />
          <Route path="/export" element={<AdminExport />} />
          <Route path="/attendance" element={<AdminAttendance />} />
          <Route path="/settings" element={<AdminSettings />} />
        </Routes>
      </div>
    </div>
  );
};

export default AdminPage;
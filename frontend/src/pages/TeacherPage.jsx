import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from '../components/common/Sidebar';
import TeacherProfile from '../components/teacher/TeacherProfile';
import TeacherAttendance from '../components/teacher/TeacherAttendance';
import TeacherClass from '../components/teacher/TeacherClass';
import TeacherStudent from '../components/teacher/TeacherStudent';
import TeacherFeedback from '../components/teacher/TeacherFeedback';
import TeacherExam from '../components/teacher/TeacherExam'; // <--- YENİ IMPORT
import './TeacherPage.css';

const TeacherPage = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="teacher-layout">
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      
      <main className={`teacher-content ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <Routes>
          <Route path="/" element={<Navigate to="/teacher/attendance" replace />} />
          <Route path="/profile" element={<TeacherProfile />} />
          <Route path="/attendance" element={<TeacherAttendance />} />
          <Route path="/classes" element={<TeacherClass />} />
          <Route path="/students" element={<TeacherStudent />} />
          <Route path="/feedback" element={<TeacherFeedback />} />
          {/* YENİ ROTA */}
          <Route path="/exams" element={<TeacherExam />} />
        </Routes>
      </main>
    </div>
  );
};

export default TeacherPage;
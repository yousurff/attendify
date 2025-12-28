import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import AdminPage from './pages/AdminPage';
import TeacherPage from './pages/TeacherPage';
import { isAuthenticated, isAdmin, isTeacher } from './utils/auth';
import './styles/global.css';

const ProtectedRoute = ({ children, requireAdmin = false }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/" replace />;
  }
  if (requireAdmin && !isAdmin()) {
    return <Navigate to="/teacher/attendance" replace />;
  }
  if (!requireAdmin && !isTeacher() && !isAdmin()) {
    return <Navigate to="/" replace />;
  }
  return children;
};

const PublicRoute = ({ children }) => {
  if (isAuthenticated()) {
    if (isAdmin()) {
      return <Navigate to="/admin/home" replace />;
    } else if (isTeacher()) {
      return <Navigate to="/teacher/attendance" replace />;
    }
  }
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/" 
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          } 
        />
        <Route 
          path="/admin/*" 
          element={
            <ProtectedRoute requireAdmin={true}>
              <AdminPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/teacher/*" 
          element={
            <ProtectedRoute>
              <TeacherPage />
            </ProtectedRoute>
          } 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  FiHome, FiUsers, FiBook, FiDownload, FiCheckSquare, 
  FiSettings, FiLogOut, FiUser, FiMenu, FiChevronLeft,
  FiMessageSquare // YENİ: Mesaj ikonu eklendi
} from 'react-icons/fi';
import { authAPI } from '../../services/api';
import { removeUser, isAdmin } from '../../utils/auth';
import './Sidebar.css';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const admin = isAdmin();

  const adminMenuItems = [
    { path: '/admin/home', icon: <FiHome />, label: 'Anasayfa' },
    { path: '/admin/teachers', icon: <FiUsers />, label: 'Öğretmen' },
    { path: '/admin/students', icon: <FiUser />, label: 'Öğrenci' },
    { path: '/admin/classes', icon: <FiBook />, label: 'Sınıf' },
    { path: '/admin/export', icon: <FiDownload />, label: 'Dışa Aktar' },
    { path: '/admin/attendance', icon: <FiCheckSquare />, label: 'Alınan Yoklamalar' },
    { path: '/admin/settings', icon: <FiSettings />, label: 'Ayarlar' }
  ];

  const teacherMenuItems = [
    { path: '/teacher/profile', icon: <FiUser />, label: 'Profil' },
    { path: '/teacher/attendance', icon: <FiCheckSquare />, label: 'Yoklama' },
    { path: '/teacher/classes', icon: <FiBook />, label: 'Sınıflarım' },
    { path: '/teacher/students', icon: <FiUsers />, label: 'Öğrencilerim' },
    // YENİ: Feedback menüsü eklendi
    { path: '/teacher/feedback', icon: <FiMessageSquare />, label: 'Geri Bildirim' }
  ];

  const menuItems = admin ? adminMenuItems : teacherMenuItems;

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      removeUser();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      removeUser();
      navigate('/');
    }
  };

  return (
    <>
      <div className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
        
        {/* Üst Kısım: Toggle Butonu ve Logo */}
        <div className="sidebar-header">
          <button onClick={toggleSidebar} className="menu-toggle-btn">
            {isOpen ? <FiChevronLeft /> : <FiMenu />}
          </button>
          
          {/* Sadece açıkken görünen logo yazısı */}
          <h1 className={`sidebar-title ${!isOpen && 'hidden'}`}>ATTENDIFY</h1>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar-item ${location.pathname === item.path ? 'active' : ''}`}
              title={!isOpen ? item.label : ''} // Kapalıyken üzerine gelince ne olduğu yazsın
            >
              <span className="sidebar-icon">{item.icon}</span>
              <span className={`sidebar-label ${!isOpen && 'hidden'}`}>{item.label}</span>
            </Link>
          ))}
        </nav>

        <button 
          className="sidebar-logout"
          onClick={handleLogout}
          title={!isOpen ? 'Güvenli Çıkış' : ''}
        >
          <span className="sidebar-icon"><FiLogOut /></span>
          <span className={`sidebar-label ${!isOpen && 'hidden'}`}>Güvenli Çıkış</span>
        </button>
      </div>

      {/* Mobilde açılınca arka planı karartma */}
      {isOpen && <div className="sidebar-overlay-mobile" onClick={toggleSidebar} />}
    </>
  );
};

export default Sidebar;
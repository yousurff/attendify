import React from 'react';
import { getUser } from '../../utils/auth';
import './Header.css';

const Header = ({ title }) => {
  const user = getUser();

  return (
    <header className="header">
      <div className="header-content">
        <h1 className="header-title">{title}</h1>
        <div className="header-user">
          <span className="user-name">{user?.full_name}</span>
          <span className="user-role">{user?.role === 'admin' ? 'Admin' : 'Öğretmen'}</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
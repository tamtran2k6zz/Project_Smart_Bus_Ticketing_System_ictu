import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header style={{
      background: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      padding: '14px 24px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '8px',
          background: '#2563eb',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          🚌
        </div>
        <div>
          <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '16px' }}>Smart Bus ICTU</span>
          <span style={{
            fontSize: '11px',
            background: '#e0f2fe',
            color: '#0369a1',
            padding: '2px 8px',
            borderRadius: '999px',
            fontWeight: 700,
            marginLeft: '8px',
          }}>
            {user?.roles?.[0] || 'PASSENGER'}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>{user?.fullName}</div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>{user?.email || user?.phone}</div>
        </div>

        <button
          onClick={handleLogout}
          style={{
            padding: '8px 14px',
            borderRadius: '8px',
            border: '1px solid #fecaca',
            background: '#fff5f5',
            color: '#ef4444',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Đăng xuất
        </button>
      </div>
    </header>
  );
};

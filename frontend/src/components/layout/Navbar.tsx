import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const role = user?.roles?.[0] || '';

  const navLinks = [
    { label: 'Trang chủ', path: '/' },
    { label: 'Tuyến xe', path: '/admin/routes' },
    { label: 'Lộ trình', path: '/search' },
    { label: 'Vé điện tử', path: '/passenger/booking' },
    { label: 'Điều hành', path: role === 'DRIVER' ? '/driver/portal' : '/admin/routes' },
  ];

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 32px',
      background: 'rgba(10, 10, 15, 0.85)',
      backdropFilter: 'blur(25px)',
      WebkitBackdropFilter: 'blur(25px)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      {/* Logo Left */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <span style={{ fontSize: '24px' }}>🚌</span>
          <span style={{
            fontSize: '19px',
            fontWeight: 700,
            background: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '0.3px',
          }}>
            SmartBus ICTU
          </span>
        </Link>
      </div>

      {/* Nav Center Pill Matching Cinematic Landing Design */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        background: 'rgba(255, 255, 255, 0.04)',
        padding: '5px 8px',
        borderRadius: '9999px',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.1), 0 8px 24px rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(16px)',
      }}>
        {navLinks.map((item) => {
          const isActive =
            item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path);

          return (
            <Link
              key={item.label}
              to={item.path}
              style={{
                color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.8)',
                background: isActive ? 'rgba(255, 255, 255, 0.18)' : 'transparent',
                padding: '7px 16px',
                borderRadius: '9999px',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 500,
                textDecoration: 'none',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: isActive ? 'inset 0 1px 1px rgba(255, 255, 255, 0.2)' : 'none',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = '#ffffff';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              {item.label}
            </Link>
          );
        })}

        <a
          href="/landing.html"
          style={{
            color: '#38bdf8',
            background: 'rgba(56, 189, 248, 0.1)',
            padding: '6px 14px',
            borderRadius: '9999px',
            fontSize: '12px',
            fontWeight: 600,
            textDecoration: 'none',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            marginLeft: '4px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
          title="Xem trang Cinematic Space Showcase"
        >
          <span>Landing ↗</span>
        </a>
      </nav>

      {/* Right User Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {isAuthenticated && user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
                {user.fullName}
              </div>
              <span style={{
                fontSize: '10px',
                padding: '2px 8px',
                borderRadius: '12px',
                fontWeight: 600,
                backgroundColor:
                  role === 'ADMIN' ? 'rgba(239, 68, 68, 0.2)' :
                  role === 'MANAGER' ? 'rgba(245, 158, 11, 0.2)' :
                  role === 'DRIVER' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                color:
                  role === 'ADMIN' ? '#f87171' :
                  role === 'MANAGER' ? '#fbbf24' :
                  role === 'DRIVER' ? '#34d399' : '#38bdf8',
                border: `1px solid ${
                  role === 'ADMIN' ? 'rgba(239, 68, 68, 0.4)' :
                  role === 'MANAGER' ? 'rgba(245, 158, 11, 0.4)' :
                  role === 'DRIVER' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(56, 189, 248, 0.4)'
                }`,
              }}>
                {role}
              </span>
            </div>

            <button
              onClick={handleLogout}
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#fca5a5',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Đăng xuất
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Link
              to="/login"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#ffffff',
                padding: '7px 16px',
                borderRadius: '9999px',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: 500,
                border: '1px solid rgba(255, 255, 255, 0.15)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s',
              }}
            >
              <span>Đăng nhập</span>
            </Link>

            <Link
              to="/register"
              style={{
                background: '#ffffff',
                color: '#000000',
                padding: '7px 16px',
                borderRadius: '9999px',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: 600,
                boxShadow: '0 4px 14px rgba(255, 255, 255, 0.2)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s',
              }}
            >
              <span>Đăng ký</span>
              <span>→</span>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};

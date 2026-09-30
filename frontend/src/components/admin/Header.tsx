import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const displayName = user?.fullName || 'Admin User';
  const displayRole = user?.roles?.includes('ADMIN')
    ? 'Quản trị viên'
    : user?.roles?.includes('MANAGER')
    ? 'Quản lý vận hành'
    : 'Nhân viên';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header className="header">
      <div>
        <h1>Quản trị tuyến & trạm</h1>
        <p>Hệ thống bán vé & điều hành xe buýt thông minh SmartBus</p>
      </div>

      <div className="admin-profile" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <a
          href="/landing.html"
          target="_blank"
          rel="noopener noreferrer"
          title="Xem trang giới thiệu Cinematic Liquid-Glass"
          style={{
            padding: '6px 14px',
            fontSize: '12px',
            borderRadius: '9999px',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            background: 'rgba(56, 189, 248, 0.08)',
            color: '#38bdf8',
            textDecoration: 'none',
            fontWeight: 500,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backdropFilter: 'blur(8px)',
            transition: 'all 0.2s',
          }}
        >
          🌌 Landing Page ↗
        </a>

        <div className="avatar">{initial}</div>
        <div>
          <strong>{displayName}</strong>
          <span>{displayRole}</span>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          title="Đăng xuất khỏi hệ thống"
          style={{
            marginLeft: '6px',
            padding: '7px 16px',
            fontSize: '12px',
            borderRadius: '9999px',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            background: 'rgba(239, 68, 68, 0.1)',
            cursor: 'pointer',
            color: '#fca5a5',
            fontWeight: 500,
            transition: 'all 0.2s ease',
            backdropFilter: 'blur(8px)',
          }}
        >
          Đăng xuất
        </button>
      </div>
    </header>
  );
}

export default Header;
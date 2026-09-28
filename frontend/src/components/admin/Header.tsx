import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

function Header({
  title = 'Quản trị tuyến & trạm',
  subtitle = 'Quản lý các tuyến xe và thứ tự trạm dừng',
}: HeaderProps) {
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
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>

      <div className="admin-profile" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
            marginLeft: '10px',
            padding: '6px 12px',
            fontSize: '12px',
            borderRadius: '6px',
            border: '1px solid #fee2e2',
            background: '#fff1f2',
            cursor: 'pointer',
            color: '#e11d48',
            fontWeight: 600,
            transition: 'background 0.2s ease',
          }}
        >
          Đăng xuất
        </button>
      </div>
    </header>
  );
}

export default Header;

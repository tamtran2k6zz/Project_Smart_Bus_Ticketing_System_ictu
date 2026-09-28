import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './UnauthorizedPage.css';

export const UnauthorizedPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogoutAndSwitch = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="unauthorized-container">
      <div className="unauthorized-card">
        <div className="unauthorized-icon">🚫</div>
        <h1 className="unauthorized-code">403</h1>
        <h2 className="unauthorized-title">Truy cập bị từ chối</h2>
        <p className="unauthorized-desc">
          Bạn không có quyền truy cập vào phân hệ hoặc tài nguyên này. Phân hệ này chỉ dành cho
          nhân sự có quyền quản trị hoặc điều hành hệ thống.
        </p>

        {user && (
          <div className="unauthorized-user-info">
            <div>
              <strong>Tài khoản hiện tại:</strong> {user.fullName} ({user.email})
            </div>
            <div>
              <strong>Vai trò hiện tại:</strong>{' '}
              <span className="role-tag">{user.roles?.join(', ')}</span>
            </div>
          </div>
        )}

        <div className="unauthorized-actions">
          <button
            type="button"
            className="btn-back"
            onClick={() => navigate(-1)}
          >
            ← Quay lại trang trước
          </button>
          <button
            type="button"
            className="btn-switch"
            onClick={handleLogoutAndSwitch}
          >
            Đăng xuất / Đổi tài khoản
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage;

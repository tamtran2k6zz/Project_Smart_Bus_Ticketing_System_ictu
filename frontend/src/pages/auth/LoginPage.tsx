import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Spinner } from '../../components/common/Spinner';
import './LoginPage.css';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, error, clearError } = useAuth();

  const [identifier, setIdentifier] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [formError, setFormError] = useState<string | null>(null);

  // Đường dẫn chuyển hướng sau khi đăng nhập thành công
  const from = (location.state as any)?.from?.pathname;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setFormError(null);

    if (!identifier.trim()) {
      setFormError('Vui lòng nhập Email hoặc Số điện thoại.');
      return;
    }

    if (!password) {
      setFormError('Vui lòng nhập mật khẩu.');
      return;
    }

    try {
      await login({ identifier: identifier.trim(), password, rememberMe });

      // Nếu có trang đích cụ thể thì redirect về đó, nếu không thì phân nhánh theo vai trò
      if (from) {
        navigate(from, { replace: true });
        return;
      }

      // Điều hướng thông minh theo vai trò
      const storedUser = localStorage.getItem('smartbus_user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        const roles = parsed.roles || [];
        if (roles.includes('ADMIN')) {
          navigate('/admin/users', { replace: true });
        } else if (roles.includes('MANAGER')) {
          navigate('/manager/reports', { replace: true });
        } else if (roles.includes('DRIVER')) {
          navigate('/driver/scanner', { replace: true });
        } else {
          navigate('/passenger/booking', { replace: true });
        }
      } else {
        navigate('/passenger/booking', { replace: true });
      }
    } catch (err: any) {
      // Lỗi đã được set trong AuthContext
    }
  };

  // Nạp tài khoản mẫu cho việc Demo & Review Sprint
  const setDemoAccount = (role: 'PASSENGER' | 'DRIVER' | 'MANAGER' | 'ADMIN') => {
    clearError();
    setFormError(null);
    switch (role) {
      case 'ADMIN':
        setIdentifier('admin@smartbus.ictu.vn');
        setPassword('Admin@2026');
        break;
      case 'MANAGER':
        setIdentifier('manager@smartbus.ictu.vn');
        setPassword('Manager@2026');
        break;
      case 'DRIVER':
        setIdentifier('0987654321');
        setPassword('Driver@2026');
        break;
      case 'PASSENGER':
        setIdentifier('0912345678');
        setPassword('Passenger@2026');
        break;
    }
  };

  return (
    <div className="login-card">
      <div className="login-header">
        <h2 className="login-title">Chào mừng trở lại! 👋</h2>
        <p className="login-subtitle">
          Nhập Email hoặc Số điện thoại để truy cập hệ thống Smart Bus
        </p>
      </div>

      {/* Demo Credentials Quick Switcher */}
      <div className="demo-role-box">
        <div className="demo-role-label">
          <span>⚡ Chọn tài khoản mẫu (Sprint 1 Review):</span>
        </div>
        <div className="demo-role-buttons">
          <button type="button" className="demo-btn" onClick={() => setDemoAccount('PASSENGER')}>
            Hành khách
          </button>
          <button type="button" className="demo-btn" onClick={() => setDemoAccount('DRIVER')}>
            Tài xế (Soát vé)
          </button>
          <button type="button" className="demo-btn" onClick={() => setDemoAccount('MANAGER')}>
            Quản lý
          </button>
          <button type="button" className="demo-btn" onClick={() => setDemoAccount('ADMIN')}>
            Admin
          </button>
        </div>
      </div>

      {/* Thông báo lỗi */}
      {(formError || error) && (
        <div className="login-error-alert">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{formError || error}</span>
        </div>
      )}

      {/* Form đăng nhập */}
      <form onSubmit={handleSubmit} noValidate>
        {/* Email hoặc SĐT */}
        <div className="form-group">
          <label className="form-label" htmlFor="identifier">
            Email hoặc Số điện thoại
          </label>
          <div className="input-wrapper">
            <span className="input-icon-left">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </span>
            <input
              id="identifier"
              type="text"
              className="form-input"
              placeholder="VD: 0981234567 hoặc ban@email.com"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                if (formError) setFormError(null);
              }}
              autoComplete="username"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Mật khẩu */}
        <div className="form-group">
          <label className="form-label" htmlFor="password">
            Mật khẩu
          </label>
          <div className="input-wrapper">
            <span className="input-icon-left">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </span>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              className="form-input"
              placeholder="Nhập mật khẩu của bạn"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (formError) setFormError(null);
              }}
              autoComplete="current-password"
              disabled={isLoading}
            />
            <button
              type="button"
              className="input-icon-right"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              {showPassword ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Ghi nhớ & Quên mật khẩu */}
        <div className="form-options">
          <label className="remember-label">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={isLoading}
            />
            <span>Ghi nhớ đăng nhập</span>
          </label>
          <a href="#forgot" className="forgot-link" onClick={(e) => e.preventDefault()}>
            Quên mật khẩu?
          </a>
        </div>

        {/* Nút Đăng nhập */}
        <button type="submit" className="btn-submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Spinner size="sm" color="#ffffff" />
              <span>Đang xác thực...</span>
            </>
          ) : (
            <>
              <span>Đăng nhập</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </>
          )}
        </button>
      </form>

      {/* Chuyển sang Đăng ký */}
      <div className="login-footer">
        <span>Chưa có tài khoản?</span>
        <Link to="/register">Đăng ký ngay</Link>
      </div>
    </div>
  );
};

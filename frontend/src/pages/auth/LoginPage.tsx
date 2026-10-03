import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
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
  const locationState = location.state as { from?: { pathname?: string } } | null;
  const from = locationState?.from?.pathname;

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

      if (from) {
        navigate(from, { replace: true });
        return;
      }

      // Điều hướng theo vai trò người dùng
      const storedUser = localStorage.getItem('smartbus_user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        const roles = parsed.roles || [];
        if (roles.includes('ADMIN') || roles.includes('MANAGER')) {
          navigate('/admin/routes', { replace: true });
        } else if (roles.includes('DRIVER')) {
          navigate('/driver/portal', { replace: true });
        } else {
          navigate('/passenger/booking', { replace: true });
        }
      } else {
        navigate('/admin/routes', { replace: true });
      }
    } catch {
      // Error handled in AuthContext
    }
  };

  return (
    <div className="login-card">
      <div className="login-header">
        <h2 className="login-title">Chào mừng trở lại! 👋</h2>
        <p className="login-subtitle">
          Đăng nhập vào hệ thống điều hành xe buýt thông minh SmartBus ICTU
        </p>
      </div>

      {(formError || error) && (
        <div className="login-error-alert">
          ⚠️ {formError || error}
        </div>
      )}

      <div className="demo-role-box">
        <div className="demo-role-label">⚡ Chuyển nhanh tài khoản kiểm thử</div>
        <div className="demo-role-buttons">
          <button
            type="button"
            className="demo-btn"
            onClick={() => {
              setIdentifier('admin@smartbus.ictu.vn');
              setPassword('Admin@123456');
              if (formError) setFormError(null);
            }}
          >
            🛡️ Admin
          </button>
          <button
            type="button"
            className="demo-btn"
            onClick={() => {
              setIdentifier('manager@smartbus.ictu.vn');
              setPassword('Manager@123456');
              if (formError) setFormError(null);
            }}
          >
            📊 Manager
          </button>
          <button
            type="button"
            className="demo-btn"
            onClick={() => {
              setIdentifier('driver@smartbus.ictu.vn');
              setPassword('Driver@123456');
              if (formError) setFormError(null);
            }}
          >
            🚌 Driver
          </button>
          <button
            type="button"
            className="demo-btn"
            onClick={() => {
              setIdentifier('passenger@smartbus.ictu.vn');
              setPassword('Passenger@123456');
              if (formError) setFormError(null);
            }}
          >
            🎫 Passenger
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label className="form-label" htmlFor="identifier">
            Email hoặc Số điện thoại
          </label>
          <div className="input-wrapper">
            <input
              id="identifier"
              type="text"
              className="form-input"
              placeholder="VD: admin@smartbus.ictu.vn hoặc 0981234567"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                if (formError) setFormError(null);
              }}
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="password">
            Mật khẩu
          </label>
          <div className="input-wrapper">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              className="form-input"
              placeholder="Nhập mật khẩu"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (formError) setFormError(null);
              }}
              disabled={isLoading}
            />
            <button
              type="button"
              className="input-icon-right"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

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

        <button type="submit" className="btn-submit" disabled={isLoading}>
          {isLoading ? 'Đang xác thực...' : 'Đăng nhập →'}
        </button>

        <div style={{
          marginTop: '20px',
          textAlign: 'center',
          fontSize: '13.5px',
          color: 'rgba(255, 255, 255, 0.7)',
        }}>
          Chưa có tài khoản?{' '}
          <Link
            to="/register"
            style={{
              color: '#38bdf8',
              fontWeight: 600,
              textDecoration: 'none',
              marginLeft: '4px',
            }}
          >
            Đăng ký tài khoản mới ➔
          </Link>
        </div>

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <a
            href="/landing.html"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: '12.5px',
              color: '#38bdf8',
              textDecoration: 'none',
              fontWeight: 500,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '9999px',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              background: 'rgba(56, 189, 248, 0.06)',
              backdropFilter: 'blur(8px)',
              transition: 'all 0.2s ease',
            }}
          >
            🌌 Mở Cinematic Space-Travel Landing Page (Liquid-Glass UI) ↗
          </a>
        </div>
      </form>
    </div>
  );
};

export default LoginPage;

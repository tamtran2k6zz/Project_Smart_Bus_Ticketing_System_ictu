import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { RoleCode } from '../../types/auth';
import './LoginPage.css';

type AuthMode = 'login' | 'register';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    login,
    register,
    resendSignupConfirmation,
    resetPassword,
    isLoading,
    error,
    emailConfirmationRequired,
    clearError,
  } = useAuth();

  const [mode, setMode] = useState<AuthMode>('login');
  const [identifier, setIdentifier] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const locationState = location.state as { from?: { pathname?: string } } | null;
  const from = locationState?.from?.pathname;

  const clearMessages = () => {
    clearError();
    setFormError(null);
    setNotice(null);
  };

  const navigateForUser = (roles: RoleCode[]) => {
    const isAdmin = roles.includes('ADMIN') || roles.includes('MANAGER');
    const isPassenger = roles.includes('PASSENGER');
    const canAccessRequestedPath =
      from &&
      ((isAdmin && from.startsWith('/admin')) ||
        (isPassenger && from.startsWith('/passenger')));

    if (canAccessRequestedPath) {
      navigate(from, { replace: true });
    } else if (isAdmin) {
      navigate('/admin/routes', { replace: true });
    } else if (isPassenger) {
      navigate('/passenger/booking', { replace: true });
    } else {
      navigate('/unauthorized', { replace: true });
    }
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    clearMessages();

    const trimmedIdentifier = identifier.trim();
    if (!trimmedIdentifier) {
      setFormError('Vui lòng nhập email hoặc số điện thoại.');
      return;
    }
    if (!password) {
      setFormError('Vui lòng nhập mật khẩu.');
      return;
    }

    try {
      const user = await login({
        identifier: trimmedIdentifier,
        password,
        rememberMe,
      });
      navigateForUser(user.roles);
    } catch {
      // AuthContext exposes the authentication error.
    }
  };

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    clearMessages();

    if (fullName.trim().length < 2) {
      setFormError('Họ và tên phải có ít nhất 2 ký tự.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier.trim())) {
      setFormError('Vui lòng nhập địa chỉ email hợp lệ.');
      return;
    }
    if (phone.trim() && !/^\+?[0-9\s-]{8,15}$/.test(phone.trim())) {
      setFormError('Số điện thoại không hợp lệ.');
      return;
    }
    if (password.length < 8) {
      setFormError('Mật khẩu phải có ít nhất 8 ký tự.');
      return;
    }
    if (password !== confirmPassword) {
      setFormError('Mật khẩu xác nhận không khớp.');
      return;
    }

    try {
      const user = await register({
        fullName: fullName.trim(),
        email: identifier.trim(),
        phone: phone.trim(),
        password,
      });
      if (user) {
        navigateForUser(user.roles);
        return;
      }

      setMode('login');
      setPassword('');
      setConfirmPassword('');
      setNotice('Đăng ký thành công. Vui lòng kiểm tra email để xác minh tài khoản.');
    } catch {
      // AuthContext exposes the registration error.
    }
  };

  const handleResetPassword = async () => {
    clearMessages();
    if (!identifier.includes('@')) {
      setFormError('Nhập email đã đăng ký để nhận liên kết đặt lại mật khẩu.');
      return;
    }

    try {
      await resetPassword(identifier.trim());
      setNotice('Đã gửi liên kết đặt lại mật khẩu. Vui lòng kiểm tra email.');
    } catch {
      // AuthContext exposes the reset error.
    }
  };

  const handleResendConfirmation = async () => {
    clearMessages();
    const email = identifier.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFormError('Vui lòng nhập email đã đăng ký để gửi lại email xác minh.');
      return;
    }

    try {
      await resendSignupConfirmation(email);
      setNotice('Đã gửi lại email xác minh. Vui lòng kiểm tra hộp thư đến và thư rác.');
    } catch {
      // AuthContext exposes the resend error.
    }
  };

  const setDemoAccount = (role: 'PASSENGER' | 'DRIVER' | 'MANAGER' | 'ADMIN') => {
    clearMessages();
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

  const switchMode = (nextMode: AuthMode) => {
    clearMessages();
    setMode(nextMode);
  };

  return (
    <div className="login-card">
      <div className="login-header">
        <h2 className="login-title">
          {mode === 'login' ? 'Chào mừng trở lại! 👋' : 'Tạo tài khoản SmartBus'}
        </h2>
        <p className="login-subtitle">
          {mode === 'login'
            ? 'Đăng nhập để tiếp tục sử dụng SmartBus ICTU'
            : 'Đăng ký tài khoản hành khách để bắt đầu hành trình'}
        </p>
      </div>

      <div className="auth-mode-switch" role="tablist" aria-label="Chọn thao tác tài khoản">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'login'}
          className={mode === 'login' ? 'auth-mode-tab active' : 'auth-mode-tab'}
          onClick={() => switchMode('login')}
          disabled={isLoading}
        >
          Đăng nhập
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'register'}
          className={mode === 'register' ? 'auth-mode-tab active' : 'auth-mode-tab'}
          onClick={() => switchMode('register')}
          disabled={isLoading}
        >
          Đăng ký
        </button>
      </div>

      {mode === 'login' && (
        <div className="demo-role-box">
          <div className="demo-role-label">Tài khoản demo</div>
          <div className="demo-role-buttons">
            <button type="button" className="demo-btn" onClick={() => setDemoAccount('ADMIN')}>
              Admin
            </button>
            <button type="button" className="demo-btn" onClick={() => setDemoAccount('MANAGER')}>
              Quản lý
            </button>
            <button type="button" className="demo-btn" onClick={() => setDemoAccount('DRIVER')}>
              Tài xế
            </button>
            <button type="button" className="demo-btn" onClick={() => setDemoAccount('PASSENGER')}>
              Hành khách
            </button>
          </div>
        </div>
      )}

      {(formError || error) && (
        <div className="login-error-alert" role="alert">
          {formError || error}
        </div>
      )}
      {emailConfirmationRequired && mode === 'login' && (
        <button
          type="button"
          className="resend-confirmation-link"
          onClick={handleResendConfirmation}
          disabled={isLoading}
        >
          {isLoading ? 'Đang gửi...' : 'Gửi lại email xác minh'}
        </button>
      )}
      {notice && (
        <div className="login-success-alert" role="status">
          {notice}
        </div>
      )}

      <form onSubmit={mode === 'login' ? handleLogin : handleRegister} noValidate>
        {mode === 'register' && (
          <div className="form-group">
            <label className="form-label" htmlFor="full-name">
              Họ và tên
            </label>
            <input
              id="full-name"
              type="text"
              className="form-input"
              placeholder="Nguyễn Văn A"
              autoComplete="name"
              value={fullName}
              onChange={event => {
                setFullName(event.target.value);
                clearMessages();
              }}
              disabled={isLoading}
              required
            />
          </div>
        )}

        <div className="form-group">
          <label className="form-label" htmlFor="identifier">
            {mode === 'register' ? 'Email' : 'Email hoặc tài khoản demo'}
          </label>
          <input
            id="identifier"
            type={mode === 'register' ? 'email' : 'text'}
            className="form-input"
            placeholder={
              mode === 'register'
                ? 'ban@example.com'
                : 'Email hoặc tài khoản demo'
            }
            autoComplete={mode === 'register' ? 'email' : 'username'}
            value={identifier}
            onChange={event => {
              setIdentifier(event.target.value);
              clearMessages();
            }}
            disabled={isLoading}
            required
          />
        </div>

        {mode === 'register' && (
          <div className="form-group">
            <label className="form-label" htmlFor="phone">
              Số điện thoại <span className="optional-label">(không bắt buộc)</span>
            </label>
            <input
              id="phone"
              type="tel"
              className="form-input"
              placeholder="0912345678"
              autoComplete="tel"
              value={phone}
              onChange={event => {
                setPhone(event.target.value);
                clearMessages();
              }}
              disabled={isLoading}
            />
          </div>
        )}

        <div className="form-group">
          <label className="form-label" htmlFor="password">
            Mật khẩu
          </label>
          <div className="input-wrapper">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              className="form-input"
              placeholder={mode === 'register' ? 'Ít nhất 8 ký tự' : 'Nhập mật khẩu'}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              value={password}
              onChange={event => {
                setPassword(event.target.value);
                clearMessages();
              }}
              disabled={isLoading}
              required
              minLength={mode === 'register' ? 8 : undefined}
            />
            <button
              type="button"
              className="input-icon-right"
              onClick={() => setShowPassword(value => !value)}
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        {mode === 'register' ? (
          <div className="form-group">
            <label className="form-label" htmlFor="confirm-password">
              Xác nhận mật khẩu
            </label>
            <input
              id="confirm-password"
              type={showPassword ? 'text' : 'password'}
              className="form-input"
              placeholder="Nhập lại mật khẩu"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={event => {
                setConfirmPassword(event.target.value);
                clearMessages();
              }}
              disabled={isLoading}
              required
            />
          </div>
        ) : (
          <div className="form-options">
            <label className="remember-label">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={event => setRememberMe(event.target.checked)}
                disabled={isLoading}
              />
              <span>Ghi nhớ đăng nhập</span>
            </label>
            <button
              type="button"
              className="forgot-link"
              onClick={handleResetPassword}
              disabled={isLoading}
            >
              Quên mật khẩu?
            </button>
          </div>
        )}

        <button type="submit" className="btn-submit" disabled={isLoading}>
          {isLoading
            ? mode === 'login'
              ? 'Đang xác thực...'
              : 'Đang tạo tài khoản...'
            : mode === 'login'
              ? 'Đăng nhập →'
              : 'Tạo tài khoản'}
        </button>
      </form>

      <p className="auth-mode-footer">
        {mode === 'login' ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}{' '}
        <button
          type="button"
          onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
          disabled={isLoading}
        >
          {mode === 'login' ? 'Đăng ký ngay' : 'Đăng nhập'}
        </button>
      </p>
    </div>
  );
};

export default LoginPage;

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './LoginPage.css';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register, isLoading, error, clearError } = useAuth();

  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setFormError(null);
    setSuccessMsg(null);

    if (!fullName.trim()) {
      setFormError('Vui lòng nhập Họ và tên.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setFormError('Vui lòng nhập địa chỉ Email hợp lệ.');
      return;
    }

    if (!phone.trim()) {
      setFormError('Vui lòng nhập Số điện thoại.');
      return;
    }

    if (password.length < 6) {
      setFormError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Mật khẩu xác nhận không khớp. Vui lòng kiểm tra lại!');
      return;
    }

    try {
      await register({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
      });

      setSuccessMsg('🎉 Đăng ký tài khoản thành công! Đang chuyển hướng...');
      setTimeout(() => {
        navigate('/passenger/booking', { replace: true });
      }, 1000);
    } catch {
      // Error handled in AuthContext
    }
  };

  return (
    <div className="login-card">
      <div className="login-header">
        <h2 className="login-title">Tạo tài khoản mới 🚀</h2>
        <p className="login-subtitle">
          Đăng ký tài khoản SmartBus ICTU để đặt vé xe buýt, chọn chỗ ngồi và nhận ưu đãi học sinh - sinh viên
        </p>
      </div>

      {(formError || error) && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <span>{formError || error}</span>
        </div>
      )}

      {successMsg && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          color: '#34d399',
          padding: '12px 16px',
          borderRadius: '12px',
          fontSize: '13px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="login-form">
        {/* Họ và tên */}
        <div className="form-group">
          <label className="form-label" htmlFor="reg-fullname">
            Họ và tên <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <div className="input-wrapper">
            <input
              id="reg-fullname"
              type="text"
              className="form-input"
              placeholder="Ví dụ: Nguyễn Văn An"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                if (formError) setFormError(null);
              }}
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Email */}
        <div className="form-group">
          <label className="form-label" htmlFor="reg-email">
            Địa chỉ Email <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <div className="input-wrapper">
            <input
              id="reg-email"
              type="email"
              className="form-input"
              placeholder="example@gmail.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (formError) setFormError(null);
              }}
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Số điện thoại */}
        <div className="form-group">
          <label className="form-label" htmlFor="reg-phone">
            Số điện thoại <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <div className="input-wrapper">
            <input
              id="reg-phone"
              type="tel"
              className="form-input"
              placeholder="0912 345 678"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (formError) setFormError(null);
              }}
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Mật khẩu */}
        <div className="form-group">
          <label className="form-label" htmlFor="reg-password">
            Mật khẩu (tối thiểu 6 ký tự) <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <div className="input-wrapper">
            <input
              id="reg-password"
              type={showPassword ? 'text' : 'password'}
              className="form-input"
              placeholder="••••••••"
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

        {/* Xác nhận mật khẩu */}
        <div className="form-group">
          <label className="form-label" htmlFor="reg-confirm-password">
            Nhập lại mật khẩu <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <div className="input-wrapper">
            <input
              id="reg-confirm-password"
              type={showPassword ? 'text' : 'password'}
              className="form-input"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (formError) setFormError(null);
              }}
              disabled={isLoading}
            />
          </div>
        </div>

        <button type="submit" className="btn-submit" disabled={isLoading}>
          {isLoading ? 'Đang tạo tài khoản...' : 'Đăng ký tài khoản →'}
        </button>

        {/* Switch to Login */}
        <div style={{
          marginTop: '20px',
          textAlign: 'center',
          fontSize: '13.5px',
          color: 'rgba(255, 255, 255, 0.7)',
        }}>
          Đã có tài khoản?{' '}
          <Link
            to="/login"
            style={{
              color: '#38bdf8',
              fontWeight: 600,
              textDecoration: 'none',
              marginLeft: '4px',
            }}
          >
            Đăng nhập ngay
          </Link>
        </div>

        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <Link
            to="/"
            style={{
              fontSize: '12.5px',
              color: 'rgba(255, 255, 255, 0.5)',
              textDecoration: 'none',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)')}
          >
            ← Quay về Trang chủ SmartBus
          </Link>
        </div>
      </form>
    </div>
  );
};

export default RegisterPage;

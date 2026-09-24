import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Spinner } from '../../components/common/Spinner';
import './LoginPage.css';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register, isLoading, error, clearError } = useAuth();

  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setFormError(null);

    if (!fullName.trim() || !email.trim() || !phone.trim() || !password) {
      setFormError('Vui lòng điền đầy đủ tất cả các trường.');
      return;
    }

    const phoneRegex = /^(0[3|5|7|8|9])[0-9]{8}$/;
    if (!phoneRegex.test(phone.trim())) {
      setFormError('Số điện thoại không đúng định dạng 10 số tại Việt Nam.');
      return;
    }

    try {
      await register({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
      });
      navigate('/passenger/booking', { replace: true });
    } catch (err: any) {
      // Đã xử lý trong AuthContext
    }
  };

  return (
    <div className="login-card">
      <div className="login-header">
        <h2 className="login-title">Đăng ký tài khoản mới 🚀</h2>
        <p className="login-subtitle">
          Tạo tài khoản hành khách để đặt vé và nhận ưu đãi từ Smart Bus ICTU
        </p>
      </div>

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

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label className="form-label" htmlFor="fullName">Họ và tên</label>
          <input
            id="fullName"
            type="text"
            className="form-input"
            style={{ paddingLeft: '14px' }}
            placeholder="VD: Nguyễn Văn A"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            className="form-input"
            style={{ paddingLeft: '14px' }}
            placeholder="VD: ban@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="phone">Số điện thoại</label>
          <input
            id="phone"
            type="tel"
            className="form-input"
            style={{ paddingLeft: '14px' }}
            placeholder="VD: 0981234567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="password">Mật khẩu</label>
          <input
            id="password"
            type="password"
            className="form-input"
            style={{ paddingLeft: '14px' }}
            placeholder="Tối thiểu 8 ký tự, có số và ký tự đặc biệt"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <button type="submit" className="btn-submit" disabled={isLoading} style={{ marginTop: '16px' }}>
          {isLoading ? (
            <>
              <Spinner size="sm" color="#ffffff" />
              <span>Đang tạo tài khoản...</span>
            </>
          ) : (
            <span>Tạo tài khoản</span>
          )}
        </button>
      </form>

      <div className="login-footer">
        <span>Đã có tài khoản?</span>
        <Link to="/login">Đăng nhập ngay</Link>
      </div>
    </div>
  );
};

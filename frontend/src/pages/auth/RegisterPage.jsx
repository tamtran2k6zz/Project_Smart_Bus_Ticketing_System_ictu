import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Phone, UserPlus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Alert from '../../components/common/Alert';

export const RegisterPage = () => {
  const { register, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'CUSTOMER',
    agreeTerms: false,
  });

  const [validationErrors, setValidationErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);

  const validateForm = () => {
    const errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[0-9]{10,11}$/;

    if (!formData.name.trim()) {
      errors.name = 'Vui lòng nhập họ và tên.';
    }

    if (!formData.email.trim()) {
      errors.email = 'Vui lòng nhập địa chỉ email.';
    } else if (!emailRegex.test(formData.email.trim())) {
      errors.email = 'Địa chỉ email không hợp lệ.';
    }

    if (formData.phone && !phoneRegex.test(formData.phone.trim())) {
      errors.phone = 'Số điện thoại không hợp lệ (10-11 chữ số).';
    }

    if (!formData.password) {
      errors.password = 'Vui lòng nhập mật khẩu.';
    } else if (formData.password.length < 6) {
      errors.password = 'Mật khẩu phải có tối thiểu 6 ký tự.';
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Vui lòng xác nhận lại mật khẩu.';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Mật khẩu xác nhận không khớp.';
    }

    if (!formData.agreeTerms) {
      errors.agreeTerms = 'Bạn cần đồng ý với điều khoản sử dụng.';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: undefined }));
    }
    if (submitError) setSubmitError(null);
    if (error) clearError();
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      await register({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role: formData.role,
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setSubmitError(err.message || 'Đăng ký tài khoản không thành công. Vui lòng thử lại!');
    }
  };

  return (
    <div className="w-full">
      <div className="text-center sm:text-left mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Đăng ký tài khoản
        </h2>
        <p className="text-sm text-slate-500 mt-2">
          Tạo tài khoản để trải nghiệm đặt vé xe buýt thông minh tại ICTU.
        </p>
      </div>

      {(submitError || error) && (
        <Alert
          type="error"
          message={submitError || error}
          onClose={() => {
            setSubmitError(null);
            clearError();
          }}
          className="mb-5"
        />
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Input
          label="Họ và tên"
          id="name"
          name="name"
          placeholder="vd: Nguyễn Hoàng Đức"
          value={formData.name}
          onChange={handleChange}
          error={validationErrors.name}
          leadingIcon={User}
          required
        />

        <Input
          label="Địa chỉ Email"
          id="email"
          name="email"
          type="email"
          placeholder="vd: student@ictu.edu.vn"
          value={formData.email}
          onChange={handleChange}
          error={validationErrors.email}
          leadingIcon={Mail}
          required
        />

        <Input
          label="Số điện thoại"
          id="phone"
          name="phone"
          type="tel"
          placeholder="vd: 0987654321"
          value={formData.phone}
          onChange={handleChange}
          error={validationErrors.phone}
          leadingIcon={Phone}
        />

        <Input
          label="Mật khẩu"
          id="password"
          name="password"
          type="password"
          placeholder="Tối thiểu 6 ký tự"
          value={formData.password}
          onChange={handleChange}
          error={validationErrors.password}
          leadingIcon={Lock}
          required
        />

        <Input
          label="Xác nhận mật khẩu"
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          placeholder="Nhập lại mật khẩu"
          value={formData.confirmPassword}
          onChange={handleChange}
          error={validationErrors.confirmPassword}
          leadingIcon={Lock}
          required
        />

        <div>
          <label className="flex items-start gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              name="agreeTerms"
              checked={formData.agreeTerms}
              onChange={handleChange}
              className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <span className="text-xs text-slate-600">
              Tôi đồng ý với{' '}
              <span className="text-blue-600 hover:underline">Điều khoản dịch vụ</span> &{' '}
              <span className="text-blue-600 hover:underline">Quy chế bảo mật</span> của SmartBus ICTU.
            </span>
          </label>
          {validationErrors.agreeTerms && (
            <p className="text-xs text-red-600 font-medium mt-1">
              {validationErrors.agreeTerms}
            </p>
          )}
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isLoading}
          icon={UserPlus}
          className="w-full shadow-md shadow-blue-500/20"
        >
          Tạo tài khoản
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-slate-600">
        Đã có tài khoản?{' '}
        <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-700 hover:underline">
          Đăng nhập ngay
        </Link>
      </div>
    </div>
  );
};

export default RegisterPage;

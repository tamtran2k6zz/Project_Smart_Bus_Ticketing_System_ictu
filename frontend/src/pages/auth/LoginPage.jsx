import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, LogIn, Sparkles, UserCheck, Shield, Bus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Alert from '../../components/common/Alert';
import { MOCK_USERS } from '../../api/authApi';

export const LoginPage = () => {
  const { login, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: true,
  });

  const [validationErrors, setValidationErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);

  // Check if user was redirected from a protected route
  const redirectReason = location.state?.message;

  const validateForm = () => {
    const errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formData.email.trim()) {
      errors.email = 'Vui lòng nhập địa chỉ email.';
    } else if (!emailRegex.test(formData.email.trim())) {
      errors.email = 'Địa chỉ email không đúng định dạng.';
    }

    if (!formData.password) {
      errors.password = 'Vui lòng nhập mật khẩu.';
    } else if (formData.password.length < 6) {
      errors.password = 'Mật khẩu phải có ít nhất 6 ký tự.';
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
    setSubmitError(null);

    if (!validateForm()) return;

    try {
      await login({
        email: formData.email,
        password: formData.password,
        rememberMe: formData.rememberMe,
      });

      // Redirect user to destination or dashboard
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (err) {
      setSubmitError(err.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin!');
    }
  };

  // Quick fill demo account for rapid evaluation and testing
  const handleQuickFill = userRole => {
    const targetUser = MOCK_USERS.find(u => u.role === userRole);
    if (targetUser) {
      setFormData({
        email: targetUser.email,
        password: targetUser.password,
        rememberMe: true,
      });
      setValidationErrors({});
      setSubmitError(null);
    }
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="text-center sm:text-left mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Đăng nhập hệ thống
        </h2>
        <p className="text-sm text-slate-500 mt-2">
          Nhập tài khoản để quản lý vé xe buýt và tra cứu tuyến đường ICTU.
        </p>
      </div>

      {/* Redirect warning or general error alerts */}
      <div className="space-y-3 mb-6">
        {redirectReason && (
          <Alert type="warning" message={redirectReason} />
        )}

        {(submitError || error) && (
          <Alert
            type="error"
            message={submitError || error}
            onClose={() => {
              setSubmitError(null);
              clearError();
            }}
          />
        )}
      </div>

      {/* Login Form */}
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <Input
          label="Địa chỉ Email"
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="vd: duc.nguyen@smartbus.ictu.vn"
          value={formData.email}
          onChange={handleChange}
          error={validationErrors.email}
          leadingIcon={Mail}
          required
        />

        <Input
          label="Mật khẩu"
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Nhập mật khẩu của bạn"
          value={formData.password}
          onChange={handleChange}
          error={validationErrors.password}
          leadingIcon={Lock}
          required
        />

        {/* Remember me & Forgot Password */}
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              name="rememberMe"
              checked={formData.rememberMe}
              onChange={handleChange}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <span className="text-xs sm:text-sm text-slate-600 font-medium">Ghi nhớ đăng nhập</span>
          </label>

          <Link
            to="/forgot-password"
            className="text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline"
          >
            Quên mật khẩu?
          </Link>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isLoading}
          icon={LogIn}
          className="w-full shadow-md shadow-blue-500/20"
        >
          Đăng nhập ngay
        </Button>
      </form>

      {/* Quick Demo Accounts Helper */}
      <div className="mt-8 p-4 rounded-xl bg-slate-100/80 border border-slate-200">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-2.5">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Tài khoản thử nghiệm nhanh (Quick Demo)</span>
        </div>
        <p className="text-[11px] text-slate-500 mb-3">
          Nhấp để tự động điền tài khoản mẫu phục vụ kiểm thử phân quyền:
        </p>

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleQuickFill('CUSTOMER')}
            className="px-2.5 py-1.5 bg-white hover:bg-blue-50 hover:border-blue-300 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 flex flex-col items-center gap-1 transition-all"
          >
            <UserCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Hành khách</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickFill('ADMIN')}
            className="px-2.5 py-1.5 bg-white hover:bg-purple-50 hover:border-purple-300 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 flex flex-col items-center gap-1 transition-all"
          >
            <Shield className="w-3.5 h-3.5 text-purple-600" />
            <span>Quản trị viên</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickFill('DRIVER')}
            className="px-2.5 py-1.5 bg-white hover:bg-amber-50 hover:border-amber-300 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 flex flex-col items-center gap-1 transition-all"
          >
            <Bus className="w-3.5 h-3.5 text-amber-600" />
            <span>Tài xế xe</span>
          </button>
        </div>
      </div>

      {/* Link to Register */}
      <div className="mt-6 text-center text-sm text-slate-600">
        Chưa có tài khoản SmartBus?{' '}
        <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-700 hover:underline">
          Đăng ký tài khoản mới
        </Link>
      </div>
    </div>
  );
};

export default LoginPage;

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Send, CheckCircle } from 'lucide-react';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Alert from '../../components/common/Alert';

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      setError('Vui lòng nhập địa chỉ email.');
      return;
    }
    if (!emailRegex.test(email.trim())) {
      setError('Địa chỉ email không hợp lệ.');
      return;
    }

    setIsLoading(true);
    try {
      // Simulate sending reset link
      await new Promise(resolve => setTimeout(resolve, 800));
      setIsSubmitted(true);
    } catch {
      setError('Không thể gửi yêu cầu đặt lại mật khẩu. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="w-full text-center">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Đã gửi hướng dẫn!</h2>
        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          Chúng tôi đã gửi đường liên kết đặt lại mật khẩu đến hộp thư{' '}
          <strong className="text-slate-800">{email}</strong>. Vui lòng kiểm tra email của bạn.
        </p>
        <Link to="/login">
          <Button variant="primary" size="md" className="w-full">
            Quay lại trang Đăng nhập
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="text-center sm:text-left mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Quên mật khẩu?
        </h2>
        <p className="text-sm text-slate-500 mt-2">
          Nhập email đã đăng ký của bạn. Chúng tôi sẽ gửi hướng dẫn khôi phục mật khẩu.
        </p>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} className="mb-5" />}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <Input
          label="Địa chỉ Email"
          id="email"
          name="email"
          type="email"
          placeholder="vd: duc.nguyen@smartbus.ictu.vn"
          value={email}
          onChange={e => {
            setEmail(e.target.value);
            if (error) setError('');
          }}
          leadingIcon={Mail}
          required
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isLoading}
          icon={Send}
          className="w-full shadow-md shadow-blue-500/20"
        >
          Gửi liên kết khôi phục
        </Button>
      </form>

      <div className="mt-6 text-center">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại Đăng nhập
        </Link>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;

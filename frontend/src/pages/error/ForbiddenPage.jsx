import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/common/Button';

export const ForbiddenPage = () => {
  const { user } = useAuth();
  const location = useLocation();
  const requiredRoles = location.state?.requiredRoles;

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-20 h-20 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center mb-6 shadow-lg shadow-red-500/10">
        <ShieldAlert className="w-10 h-10" />
      </div>

      <span className="text-xs font-bold tracking-widest text-red-600 uppercase px-3 py-1 rounded-full bg-red-50 border border-red-200 mb-3">
        Lỗi 403 • Truy cập bị từ chối
      </span>

      <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
        Bạn không có quyền truy cập trang này
      </h1>

      <p className="text-sm text-slate-500 max-w-md mb-6 leading-relaxed">
        Tài khoản hiện tại của bạn có vai trò{' '}
        <strong className="text-slate-800 font-semibold">{user?.role || 'Chưa xác định'}</strong>, không đủ quyền hạn để truy cập tài nguyên này
        {requiredRoles ? ` (Yêu cầu vai trò: ${Array.isArray(requiredRoles) ? requiredRoles.join(', ') : requiredRoles})` : ''}.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link to="/dashboard">
          <Button variant="primary" size="md" icon={ArrowLeft}>
            Về Bảng điều khiển
          </Button>
        </Link>
        <Link to="/">
          <Button variant="outline" size="md" icon={Home}>
            Về Trang chủ
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default ForbiddenPage;

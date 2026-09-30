import React from 'react';
import { Shield, Users, Bus, TrendingUp, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/common/Button';

export const AdminDashboardPage = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-semibold mb-3 border border-purple-500/30">
            <Shield className="w-3.5 h-3.5" />
            Khu vực Quản trị Hệ thống (Admin Portal)
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Quản trị Vận hành Xe Buýt ICTU
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Chào mừng Quản trị viên <strong className="text-white">{user?.name}</strong>. Giám sát tuyến đường, vé và điều phối xe.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="primary" size="md">
            + Thêm chuyến xe mới
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase">Chuyến xe hôm nay</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Bus className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">42 chuyến</p>
          <span className="text-xs text-emerald-600 font-medium">↑ 100% đúng giờ</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase">Vé đã phát hành</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">1,280 vé</p>
          <span className="text-xs text-purple-600 font-medium">Tỷ lệ lấp đầy: 84%</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase">Doanh thu vé ngày</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">15.420.000 đ</p>
          <span className="text-xs text-emerald-600 font-medium">↑ 12% so với hôm qua</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase">Sự cố kỹ thuật</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">0 cảnh báo</p>
          <span className="text-xs text-slate-500">Tất cả xe vận hành an toàn</span>
        </div>
      </div>

      {/* Role Guard Demonstration Box */}
      <div className="p-6 rounded-2xl bg-blue-50/70 border border-blue-200">
        <h3 className="text-base font-bold text-blue-900 flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-600" />
          Phân quyền Protected Routes (RBAC Test)
        </h3>
        <p className="text-xs sm:text-sm text-blue-800 mt-1 leading-relaxed">
          Trang này được bảo vệ bởi thành phần <code className="px-1.5 py-0.5 rounded bg-blue-100 font-mono text-blue-900 font-semibold">&lt;ProtectedRoute allowedRoles={['ADMIN']} /&gt;</code>.
          Chỉ người dùng có vai trò <strong className="font-semibold text-blue-900">ADMIN</strong> mới có quyền truy cập. Nếu tài khoản với vai trò <code className="font-mono">CUSTOMER</code> hoặc <code className="font-mono">DRIVER</code> truy cập URL này, hệ thống sẽ tự động chặn và chuyển hướng sang trang <code className="font-mono">/403 (Forbidden)</code>.
        </p>
      </div>
    </div>
  );
};

export default AdminDashboardPage;

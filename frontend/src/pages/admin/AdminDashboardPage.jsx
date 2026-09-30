import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  Users,
  Bus,
  TrendingUp,
  AlertTriangle,
  CreditCard,
  Ticket,
  ArrowRight,
  LayoutDashboard,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/common/Button';
import AdminBookingsPage from './AdminBookingsPage';
import AdminRevenueReconciliationPage from './AdminRevenueReconciliationPage';

export const AdminDashboardPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('bookings'); // 'bookings' | 'reconciliation' | 'overview'

  return (
    <div className="space-y-6">
      {/* Navigation Tabs for Admin Portal */}
      <div className="flex border-b border-slate-200 gap-2 sm:gap-4 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('bookings')}
          className={`flex items-center gap-2 py-3 px-4 font-semibold text-sm border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'bookings'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
          data-testid="tab-bookings"
        >
          <CreditCard className="w-4 h-4 text-blue-600" />
          <span>Quản lý Giao dịch & Vé đặt (US 06)</span>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700">
            DoD Ready
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reconciliation')}
          className={`flex items-center gap-2 py-3 px-4 font-semibold text-sm border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'reconciliation'
              ? 'border-emerald-600 text-emerald-600 bg-emerald-50/50 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
          data-testid="tab-reconciliation"
        >
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          <span>Đối soát Doanh thu (STT 25)</span>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700">
            DoD Ready
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 py-3 px-4 font-semibold text-sm border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
          data-testid="tab-overview"
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Tổng quan Vận hành Xe</span>
        </button>
      </div>

      {/* Tab 1: Bookings & Transactions Management (US 06) */}
      {activeTab === 'bookings' && <AdminBookingsPage />}

      {/* Tab 2: Revenue Reconciliation Management (US 06 STT 25) */}
      {activeTab === 'reconciliation' && <AdminRevenueReconciliationPage />}

      {/* Tab 2: General Operational Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-in fade-in duration-200">
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
              <Link to="/admin/bookings">
                <Button variant="primary" size="md" icon={CreditCard}>
                  Quản lý Giao dịch
                </Button>
              </Link>
            </div>
          </div>

          {/* Quick Callout to US 06 Payment Gateway Feature */}
          <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/10">
                <Ticket className="w-6 h-6 text-blue-300" />
              </div>
              <div>
                <h3 className="text-base font-bold">Tính năng US 06: Cổng thanh toán trực tuyến</h3>
                <p className="text-xs text-blue-200 mt-0.5">
                  Dữ liệu vé xe, đối soát cổng thanh toán VNPay, MoMo và trạng thái hoàn tiền.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab('bookings')}
              className="bg-white text-blue-900 hover:bg-blue-50 border-white shrink-0 font-semibold"
              icon={ArrowRight}
            >
              Mở bảng dữ liệu vé đặt
            </Button>
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
      )}
    </div>
  );
};

export default AdminDashboardPage;

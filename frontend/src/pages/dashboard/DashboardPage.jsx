import React from 'react';
import { Link } from 'react-router-dom';
import {
  Ticket,
  Bus,
  Clock,
  MapPin,
  CheckCircle,
  ArrowRight,
  Shield,
  Search,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/common/Button';

export const DashboardPage = () => {
  const { user } = useAuth();

  const mockActiveTickets = [
    {
      id: 'TCK-2026-001',
      routeCode: 'BUS-01',
      routeName: 'ICTU ⇄ Bến xe Trung tâm Thái Nguyên',
      departureTime: '07:30 - Hôm nay',
      seatNumber: 'A12',
      busPlate: '20B-123.45',
      status: 'CONFIRMED',
      price: '15.000 VNĐ',
    },
    {
      id: 'TCK-2026-002',
      routeCode: 'BUS-03',
      routeName: 'ICTU ⇄ Đại học Nông Lâm Thái Nguyên',
      departureTime: '17:15 - Ngày mai',
      seatNumber: 'B04',
      busPlate: '20B-987.65',
      status: 'CONFIRMED',
      price: '10.000 VNĐ',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 rounded-2xl p-6 sm:p-8 text-white shadow-lg shadow-blue-500/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-blue-100 text-xs font-semibold mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Phiên đăng nhập an toàn
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Xin chào, {user?.name || 'Hành khách'}! 👋
          </h1>
          <p className="text-blue-100 text-sm mt-1 max-w-xl">
            Chào mừng bạn đến với Cổng thông tin xe buýt thông minh ICTU. Tra cứu chuyến đi và quản lý vé trực tuyến dễ dàng.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link to="/tickets">
            <Button variant="secondary" size="md" icon={Ticket}>
              Vé của tôi
            </Button>
          </Link>
          {user?.role === 'ADMIN' && (
            <Link to="/admin">
              <Button
                variant="outline"
                size="md"
                icon={Shield}
                className="bg-white/10 hover:bg-white/20 text-white border-white/30"
              >
                Trang Quản trị
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Ticket className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Vé đang hoạt động</p>
            <p className="text-xl font-bold text-slate-900">2 vé</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Bus className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Chuyến đã đi</p>
            <p className="text-xl font-bold text-slate-900">18 chuyến</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Chuyến kế tiếp</p>
            <p className="text-xl font-bold text-slate-900">07:30 Sáng</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Vai trò hệ thống</p>
            <p className="text-base font-bold text-slate-900">{user?.role || 'CUSTOMER'}</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Trip Search & Upcoming Tickets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 spans): Active Tickets */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Bus className="w-5 h-5 text-blue-600" />
              Vé xe sắp khởi hành
            </h2>
            <Link
              to="/tickets"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              Xem tất cả <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {mockActiveTickets.map(ticket => (
              <div
                key={ticket.id}
                className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-blue-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-bold">
                      {ticket.routeCode}
                    </span>
                    <span className="text-xs font-mono text-slate-500">{ticket.id}</span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle className="w-3 h-3" /> Đã xác nhận
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{ticket.routeName}</h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" /> {ticket.departureTime}
                    </span>
                    <span>Ghế: <strong className="text-slate-800">{ticket.seatNumber}</strong></span>
                    <span>Xe: <strong className="text-slate-800">{ticket.busPlate}</strong></span>
                  </div>
                </div>

                <div className="flex items-center sm:flex-col sm:items-end justify-between border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                  <span className="text-sm font-bold text-blue-600">{ticket.price}</span>
                  <Link to={`/tickets`}>
                    <Button variant="outline" size="sm" className="mt-1">
                      Mã vé QR
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Quick Trip Search Box */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-600" />
            Tra cứu chuyến xe nhanh
          </h2>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Điểm đi (Xuất phát)
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <select className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>Điểm dừng Cổng chính ICTU</option>
                  <option>Bến xe Trung tâm Thái Nguyên</option>
                  <option>Khu KTX Sinh viên Tập trung</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Điểm đến
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <select className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>Bến xe Trung tâm Thái Nguyên</option>
                  <option>Đại học Sư phạm Thái Nguyên</option>
                  <option>Đại học Y Dược Thái Nguyên</option>
                  <option>Cổng chính ICTU</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Ngày khởi hành
              </label>
              <input
                type="date"
                defaultValue={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <Button variant="primary" size="md" icon={Search} className="w-full">
              Tìm chuyến xe
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;

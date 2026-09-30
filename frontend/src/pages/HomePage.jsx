import React from 'react';
import { Link } from 'react-router-dom';
import { Bus, MapPin, QrCode, ShieldCheck, ArrowRight, Clock, Star, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/common/Button';

export const HomePage = () => {
  const { isAuthenticated } = useAuth();

  const featuredRoutes = [
    {
      code: 'BUS-01',
      name: 'ICTU ⇄ Bến xe Trung tâm Thái Nguyên',
      stops: '12 điểm dừng',
      time: '35 phút',
      price: '15.000 đ',
      frequency: '15 phút/chuyến',
    },
    {
      code: 'BUS-02',
      name: 'ICTU ⇄ Đại học Sư phạm Thái Nguyên',
      stops: '8 điểm dừng',
      time: '25 phút',
      price: '10.000 đ',
      frequency: '20 phút/chuyến',
    },
    {
      code: 'BUS-03',
      name: 'ICTU ⇄ Đại học Nông Lâm Thái Nguyên',
      stops: '10 điểm dừng',
      time: '30 phút',
      price: '12.000 đ',
      frequency: '30 phút/chuyến',
    },
  ];

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="relative rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-800 text-white p-8 sm:p-12 lg:p-16 overflow-hidden shadow-xl shadow-blue-500/10">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-blue-100 text-xs font-semibold backdrop-blur-xs">
            <Bus className="w-4 h-4 text-blue-200" />
            Hệ thống xe buýt thông minh Đại học CNTT & TT Thái Nguyên
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            Đặt vé xe buýt trực tuyến <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 via-sky-200 to-white">
              Nhanh chóng & Tiện lợi
            </span>
          </h1>

          <p className="text-base sm:text-lg text-blue-100/90 leading-relaxed max-w-2xl">
            Không cần xếp hàng chờ đợi. Tra cứu tuyến xe, chọn ghế ngồi theo thời gian thực và quét mã QR lên xe buýt chỉ trong tích tắc.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            {isAuthenticated ? (
              <Link to="/dashboard">
                <Button variant="secondary" size="lg" icon={ArrowRight}>
                  Vào Bảng điều khiển
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="secondary" size="lg" icon={ArrowRight}>
                    Đăng nhập hệ thống
                  </Button>
                </Link>
                <Link to="/register">
                  <Button
                    variant="outline"
                    size="lg"
                    className="bg-white/10 hover:bg-white/20 text-white border-white/30"
                  >
                    Đăng ký tài khoản mới
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Featured Routes */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Các tuyến xe buýt kết nối ICTU
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Các tuyến xe phục vụ hàng ngày cho cán bộ giảng viên và sinh viên
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featuredRoutes.map(route => (
            <div
              key={route.code}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
                    {route.code}
                  </span>
                  <span className="text-sm font-bold text-blue-600">{route.price}</span>
                </div>
                <h3 className="text-base font-bold text-slate-900">{route.name}</h3>

                <div className="space-y-1.5 text-xs text-slate-500 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>Lộ trình: {route.stops}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Thời gian dự kiến: {route.time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>Tần suất: {route.frequency}</span>
                  </div>
                </div>
              </div>

              <div className="pt-5 mt-5 border-t border-slate-100">
                <Link to={isAuthenticated ? '/dashboard' : '/login'}>
                  <Button variant="outline" size="sm" className="w-full">
                    Chọn chuyến này
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Highlights / Features */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <QrCode className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Vé điện tử QR thông minh</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Mỗi vé xe có mã QR định danh duy nhất. Hành khách chỉ cần đưa điện thoại cho tài xế quét mã để lên xe an toàn, không lo thất lạc vé giấy.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <MapPin className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Theo dõi lộ trình thực tế</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Xem vị trí xe buýt, các trạm dừng và thời gian ước tính đến từng trạm, giúp bạn chủ động thời gian học tập và làm việc.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Bảo mật & Phân quyền</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Hệ thống phân quyền chi tiết cho Hành khách, Tài xế và Quản trị viên theo chuẩn xác thực JWT và Protected Routes an toàn tuyệt đối.
          </p>
        </div>
      </section>
    </div>
  );
};

export default HomePage;

import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Bus, ArrowLeft, ShieldCheck, Clock, QrCode, MapPin } from 'lucide-react';

export const AuthLayout = () => {
  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col lg:flex-row">
      {/* Left Branding / Hero Banner (visible on LG screens) */}
      <div className="relative hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-950 text-white p-12 flex-col justify-between overflow-hidden">
        {/* Background decorative circles & grid */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-blue-600/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="relative z-10">
          <Link to="/" className="inline-flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-lg shadow-black/20 group-hover:scale-105 transition-transform">
              <Bus className="w-7 h-7 text-blue-300" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                SmartBus <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-200 border border-blue-400/30 font-semibold">ICTU</span>
              </span>
              <p className="text-xs text-blue-200/80 font-medium">Hệ thống đặt vé xe buýt thông minh</p>
            </div>
          </Link>
        </div>

        {/* Center Content / Highlights */}
        <div className="relative z-10 my-auto py-8 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-semibold uppercase tracking-wider mb-6">
            <ShieldCheck className="w-4 h-4 text-blue-300" />
            Nền tảng vé xe buýt số thế hệ mới
          </div>

          <h1 className="text-3xl xl:text-4xl font-extrabold text-white tracking-tight leading-tight mb-4">
            Di chuyển tiện lợi, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 via-sky-300 to-indigo-200">
              Kết nối hành trình thông minh
            </span>
          </h1>

          <p className="text-sm xl:text-base text-blue-100/80 leading-relaxed mb-8">
            Giải pháp đặt vé, tra cứu tuyến đường và quản lý hành trình tự động dành riêng cho cán bộ, giảng viên và sinh viên Đại học Công nghệ Thông tin & Truyền thông (ICTU).
          </p>

          {/* Feature List */}
          <div className="space-y-4">
            <div className="flex items-start gap-3.5 p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0 text-blue-300">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Tra cứu tuyến xe & điểm dừng tức thì</h4>
                <p className="text-xs text-blue-200/70">Theo dõi lộ trình, thời gian ước tính và trạng thái chuyến xe.</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs">
              <div className="w-8 h-8 rounded-lg bg-sky-500/20 flex items-center justify-center shrink-0 text-sky-300">
                <QrCode className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Vé điện tử QR Code tiện lợi</h4>
                <p className="text-xs text-blue-200/70">Không lo mất vé giấy, quét mã lên xe trong 1 giây qua điện thoại.</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0 text-indigo-300">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Đặt vé & giữ chỗ linh hoạt 24/7</h4>
                <p className="text-xs text-blue-200/70">Chọn số ghế trực quan, thanh toán nhanh chóng và an toàn tuyệt đối.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Stat Footer */}
        <div className="relative z-10 pt-6 border-t border-white/10 flex items-center justify-between text-xs text-blue-200/70">
          <span>Dự án Công nghệ Phần mềm - Nhóm N5 ICTU</span>
          <span className="flex items-center gap-1.5 font-medium text-blue-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Hệ thống đang hoạt động
          </span>
        </div>
      </div>

      {/* Right Form Card Side */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-16 overflow-y-auto">
        {/* Top bar with Back to Home & Mobile Brand */}
        <div className="flex items-center justify-between w-full max-w-md mx-auto mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Về trang chủ
          </Link>

          {/* Compact brand header on mobile/tablet */}
          <div className="lg:hidden flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Bus className="w-5 h-5" />
            </div>
            <span className="text-sm font-bold text-slate-800">SmartBus ICTU</span>
          </div>
        </div>

        {/* Dynamic Auth Content (Login, Register, Forgot Password) */}
        <div className="w-full max-w-md mx-auto my-auto">
          <Outlet />
        </div>

        {/* Bottom Footer */}
        <div className="w-full max-w-md mx-auto mt-8 pt-6 border-t border-slate-200 text-center text-xs text-slate-500 space-y-1">
          <p>© 2026 Smart Bus Ticketing System. Trường ĐH CNTT & TT (ICTU).</p>
          <div className="flex items-center justify-center gap-4 text-slate-400 pt-1">
            <Link to="#" className="hover:text-slate-600 transition-colors">Điều khoản dịch vụ</Link>
            <span>•</span>
            <Link to="#" className="hover:text-slate-600 transition-colors">Chính sách bảo mật</Link>
            <span>•</span>
            <Link to="#" className="hover:text-slate-600 transition-colors">Hỗ trợ kỹ thuật</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;

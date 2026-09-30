import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import Navbar from '../components/navigation/Navbar';
import OfflineBanner from '../components/common/OfflineBanner';
import { Bus, Mail, Phone, MapPin, Heart } from 'lucide-react';

export const AppLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      {/* Network Offline / Reconnection Banner */}
      <OfflineBanner />

      {/* Top Navbar */}
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Col 1: Brand & Intro */}
            <div className="space-y-3 md:col-span-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                  <Bus className="w-5 h-5" />
                </div>
                <span className="font-bold text-base text-slate-900">SmartBus ICTU</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Hệ thống đặt vé và quản lý xe buýt trực tuyến thông minh dành cho sinh viên và cán bộ giảng viên ICTU Thái Nguyên.
              </p>
            </div>

            {/* Col 2: Navigation */}
            <div>
              <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">Liên kết nhanh</h4>
              <ul className="space-y-2 text-xs text-slate-600">
                <li><Link to="/" className="hover:text-blue-600 transition-colors">Trang chủ</Link></li>
                <li><Link to="/dashboard" className="hover:text-blue-600 transition-colors">Tra cứu tuyến xe</Link></li>
                <li><Link to="/tickets" className="hover:text-blue-600 transition-colors">Vé xe của tôi</Link></li>
                <li><Link to="/login" className="hover:text-blue-600 transition-colors">Đăng nhập tài khoản</Link></li>
              </ul>
            </div>

            {/* Col 3: Support */}
            <div>
              <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">Hỗ trợ sinh viên</h4>
              <ul className="space-y-2 text-xs text-slate-600">
                <li><span className="hover:text-blue-600 cursor-pointer">Hướng dẫn đặt vé</span></li>
                <li><span className="hover:text-blue-600 cursor-pointer">Chính sách đổi trả vé</span></li>
                <li><span className="hover:text-blue-600 cursor-pointer">Bảng giá vé ưu đãi HSSV</span></li>
                <li><span className="hover:text-blue-600 cursor-pointer">Câu hỏi thường gặp (FAQ)</span></li>
              </ul>
            </div>

            {/* Col 4: Contact */}
            <div className="space-y-2 text-xs text-slate-600">
              <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">Liên hệ hỗ trợ</h4>
              <p className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Trường ĐH CNTT & TT, Thái Nguyên</span>
              </p>
              <p className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-blue-600 shrink-0" />
                <span>(0280) 3846 254</span>
              </p>
              <p className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-600 shrink-0" />
                <span>smartbus@ictu.edu.vn</span>
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
            <p>© 2026 Smart Bus Ticketing System. All rights reserved.</p>
            <p className="flex items-center gap-1">
              Phát triển bởi <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" /> Nhóm N5 - ICTU
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AppLayout;

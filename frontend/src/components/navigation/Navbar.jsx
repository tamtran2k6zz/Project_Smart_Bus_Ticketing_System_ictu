import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Bus,
  User as _UserIcon,
  LogOut,
  Shield,
  Menu,
  X,
  Ticket,
  LayoutDashboard,
  CreditCard,
  TrendingUp,
  WifiOff,
  Wifi,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNetworkStatus } from '../../contexts/NetworkStatusContext';
import Button from '../common/Button';

export const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { isOnline } = useNetworkStatus();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile drawer on Escape key
  useEffect(() => {
    const handleKeyDown = e => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };
    if (mobileMenuOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const roleLabels = {
    ADMIN: { text: 'Quản trị viên', color: 'bg-purple-100 text-purple-700 border-purple-200' },
    DRIVER: { text: 'Tài xế', color: 'bg-amber-100 text-amber-700 border-amber-200' },
    CUSTOMER: { text: 'Hành khách', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  };

  const userRole = user?.role ? roleLabels[user.role] : null;

  const isActive = path => location.pathname === path;

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand Logo */}
            <Link to="/" className="flex items-center gap-2.5 group shrink-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-blue-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <Bus className="w-6 h-6" />
              </div>
              <div>
                <span className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                  SmartBus <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-semibold border border-blue-200">ICTU</span>
                </span>
                <p className="text-[11px] text-slate-500 font-medium leading-none hidden sm:block">Hệ thống vé xe buýt thông minh</p>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              <Link
                to="/"
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/') ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Trang chủ
              </Link>

              {isAuthenticated && (
                <>
                  <Link
                    to="/dashboard"
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                      isActive('/dashboard') ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Bảng điều khiển
                  </Link>

                  <Link
                    to="/tickets"
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                      isActive('/tickets') ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Ticket className="w-4 h-4" />
                    Vé của tôi
                  </Link>

                  {user?.role === 'ADMIN' && (
                    <>
                      <Link
                        to="/admin"
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                          isActive('/admin') ? 'bg-purple-50 text-purple-700 font-semibold' : 'text-purple-600 hover:text-purple-800 hover:bg-purple-50/50'
                        }`}
                      >
                        <Shield className="w-4 h-4" />
                        Quản trị
                      </Link>
                      <Link
                        to="/admin/bookings"
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                          isActive('/admin/bookings') || isActive('/admin/transactions')
                            ? 'bg-blue-50 text-blue-700 font-semibold'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        <CreditCard className="w-4 h-4" />
                        Vé & Giao dịch
                      </Link>
                      <Link
                        to="/admin/reconciliation"
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                          isActive('/admin/reconciliation') || isActive('/admin/revenue')
                            ? 'bg-emerald-50 text-emerald-700 font-semibold'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                        Đối soát Doanh thu
                      </Link>
                      <Link
                        to="/admin/schedules"
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                          isActive('/admin/schedules')
                            ? 'bg-indigo-50 text-indigo-700 font-semibold'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        <Calendar className="w-4 h-4 text-indigo-600" />
                        Lịch trình
                      </Link>
                      <Link
                        to="/admin/monthly-tickets"
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                          isActive('/admin/monthly-tickets')
                            ? 'bg-purple-50 text-purple-700 font-semibold'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        <Ticket className="w-4 h-4 text-purple-600" />
                        Vé tháng
                      </Link>
                    </>
                  )}
                </>
              )}
            </nav>

            {/* Desktop User / Auth CTA & Network Pill */}
            <div className="hidden md:flex items-center gap-3">
              {/* Network Status Badge */}
              {!isOnline ? (
                <div
                  data-testid="nav-offline-pill"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold animate-pulse"
                  title="Hệ thống đang hoạt động ngoại tuyến"
                >
                  <WifiOff className="w-3.5 h-3.5 text-rose-600" />
                  <span>Ngoại tuyến</span>
                </div>
              ) : (
                <div
                  data-testid="nav-online-pill"
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200"
                  title="Đã kết nối Internet ổn định"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="hidden xl:inline">Trực tuyến</span>
                </div>
              )}

              {isAuthenticated ? (
                <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
                  <Link
                    to="/profile"
                    className="flex items-center gap-2.5 p-1.5 pr-3 rounded-full hover:bg-slate-100 transition-colors"
                  >
                    {user?.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-8 h-8 rounded-full object-cover border border-slate-200"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                        {user?.name?.charAt(0) || 'U'}
                      </div>
                    )}
                    <div className="text-left">
                      <p className="text-xs font-semibold text-slate-800 leading-tight">{user?.name}</p>
                      {userRole && (
                        <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded border font-medium ${userRole.color}`}>
                          {userRole.text}
                        </span>
                      )}
                    </div>
                  </Link>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogout}
                    icon={LogOut}
                    title="Đăng xuất"
                    aria-label="Đăng xuất"
                  >
                    Đăng xuất
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link to="/login">
                    <Button variant="ghost" size="sm">
                      Đăng nhập
                    </Button>
                  </Link>
                  <Link to="/register">
                    <Button variant="primary" size="sm">
                      Đăng ký
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Header Right: Network badge + Hamburger button */}
            <div className="flex items-center gap-2 md:hidden">
              {!isOnline && (
                <div
                  data-testid="nav-offline-pill-mobile"
                  className="flex items-center gap-1 px-2 py-1 rounded-full bg-rose-100 text-rose-800 text-[11px] font-semibold border border-rose-300"
                >
                  <WifiOff className="w-3 h-3 text-rose-600" />
                  <span>Offline</span>
                </div>
              )}

              <button
                type="button"
                data-testid="mobile-menu-btn"
                onClick={() => setMobileMenuOpen(prev => !prev)}
                className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none cursor-pointer"
                aria-expanded={mobileMenuOpen}
                aria-label="Menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Backdrop Overlay */}
      {mobileMenuOpen && (
        <div
          data-testid="mobile-drawer-backdrop"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-200"
          aria-hidden="true"
        />
      )}

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div
          data-testid="mobile-nav-drawer"
          className="fixed inset-x-0 top-16 z-50 md:hidden bg-white border-b border-slate-200 shadow-xl px-4 pt-3 pb-6 space-y-2 max-h-[calc(100vh-4rem)] overflow-y-auto animate-in slide-in-from-top-4 duration-200"
        >
          {isAuthenticated ? (
            <>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
                    {user?.name?.charAt(0) || 'U'}
                  </div>
                  <div className="truncate">
                    <p className="text-sm font-semibold text-slate-900 truncate">{user?.name}</p>
                    <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                  </div>
                </div>
                {userRole && (
                  <span className={`text-[10px] px-2 py-0.5 rounded border font-medium shrink-0 ${userRole.color}`}>
                    {userRole.text}
                  </span>
                )}
              </div>

              {/* Status indicator inside mobile menu */}
              <div className="px-3 py-2 rounded-lg bg-slate-100/70 flex items-center justify-between text-xs text-slate-600 mb-2">
                <span>Trạng thái kết nối:</span>
                {isOnline ? (
                  <span className="flex items-center gap-1 font-semibold text-emerald-700">
                    <Wifi className="w-3.5 h-3.5 text-emerald-600" /> Trực tuyến
                  </span>
                ) : (
                  <span className="flex items-center gap-1 font-semibold text-rose-700">
                    <WifiOff className="w-3.5 h-3.5 text-rose-600" /> Ngoại tuyến (Cache)
                  </span>
                )}
              </div>

              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/') ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                Trang chủ
              </Link>
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/dashboard') ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                Bảng điều khiển
              </Link>
              <Link
                to="/tickets"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/tickets') ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                Vé của tôi
              </Link>
              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/profile') ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                Hồ sơ cá nhân
              </Link>

              {user?.role === 'ADMIN' && (
                <div className="pt-2 border-t border-slate-100 space-y-1">
                  <div className="text-[11px] font-semibold text-slate-400 px-3 uppercase tracking-wider">
                    Khu vực Quản trị (Admin)
                  </div>
                  <Link
                    to="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive('/admin') ? 'bg-purple-100 text-purple-800 font-semibold' : 'text-purple-700 hover:bg-purple-50'
                    }`}
                  >
                    Bảng Quản trị tổng quan
                  </Link>
                  <Link
                    to="/admin/bookings"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive('/admin/bookings') ? 'bg-blue-100 text-blue-800 font-semibold' : 'text-blue-700 hover:bg-blue-50'
                    }`}
                  >
                    Quản lý Vé & Giao dịch (US 06)
                  </Link>
                  <Link
                    to="/admin/reconciliation"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive('/admin/reconciliation') ? 'bg-emerald-100 text-emerald-800 font-semibold' : 'text-emerald-700 hover:bg-emerald-50'
                    }`}
                  >
                    Đối soát Doanh thu (STT 25)
                  </Link>
                  <Link
                    to="/admin/schedules"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive('/admin/schedules') ? 'bg-indigo-100 text-indigo-800 font-semibold' : 'text-indigo-700 hover:bg-indigo-50'
                    }`}
                  >
                    Lịch trình chạy xe
                  </Link>
                  <Link
                    to="/admin/monthly-tickets"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive('/admin/monthly-tickets') ? 'bg-purple-100 text-purple-800 font-semibold' : 'text-purple-700 hover:bg-purple-50'
                    }`}
                  >
                    Đăng ký Vé tháng trực tuyến
                  </Link>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  icon={LogOut}
                  className="w-full text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
                >
                  Đăng xuất
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-2 pt-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-center px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Đăng nhập
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-center px-4 py-2.5 bg-blue-600 rounded-lg text-sm font-medium text-white hover:bg-blue-700"
              >
                Đăng ký tài khoản
              </Link>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default Navbar;

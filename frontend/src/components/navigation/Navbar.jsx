import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Bus, User, LogOut, Shield, Menu, X, Ticket, LayoutDashboard, CreditCard, TrendingUp } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../common/Button';

export const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-blue-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Bus className="w-6 h-6" />
            </div>
            <div>
              <span className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                SmartBus <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-semibold border border-blue-200">ICTU</span>
              </span>
              <p className="text-[11px] text-slate-500 font-medium leading-none">Hệ thống vé xe buýt thông minh</p>
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
                  </>
                )}
              </>
            )}
          </nav>

          {/* Desktop User / Auth CTA */}
          <div className="hidden md:flex items-center gap-3">
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
                      <span className={`inline-block text-[10px] px-1.5 py-0.2 rounded border font-medium ${userRole.color}`}>
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

          {/* Mobile menu button */}
          <div className="flex md:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(prev => !prev)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-2">
          {isAuthenticated ? (
            <>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl mb-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                  {user?.name?.charAt(0) || 'U'}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{user?.name}</p>
                  <p className="text-xs text-slate-500">{user?.email}</p>
                  {userRole && (
                    <span className={`inline-block mt-1 text-[10px] px-1.5 py-0.2 rounded border font-medium ${userRole.color}`}>
                      {userRole.text}
                    </span>
                  )}
                </div>
              </div>

              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Trang chủ
              </Link>
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Bảng điều khiển
              </Link>
              <Link
                to="/tickets"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Vé của tôi
              </Link>
              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Hồ sơ cá nhân
              </Link>
              {user?.role === 'ADMIN' && (
                <>
                  <Link
                    to="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-medium text-purple-700 bg-purple-50"
                  >
                    Trang quản trị (Admin)
                  </Link>
                  <Link
                    to="/admin/bookings"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-medium text-blue-700 bg-blue-50"
                  >
                    Quản lý Vé & Giao dịch (US 06)
                  </Link>
                  <Link
                    to="/admin/reconciliation"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-medium text-emerald-700 bg-emerald-50"
                  >
                    Đối soát Doanh thu (STT 25)
                  </Link>
                </>
              )}

              <div className="pt-2">
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
    </header>
  );
};

export default Navbar;

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AuthLayout from '../components/layout/AuthLayout';
import LoginPage from '../pages/auth/LoginPage';
import { ProtectedRoute } from '../components/routes/ProtectedRoute';
import { PublicRoute } from '../components/routes/PublicRoute';
import UnauthorizedPage from '../pages/error/UnauthorizedPage';
import Sidebar from '../components/admin/Sidebar';
import RouteManagementPage from '../pages/admin/RouteManagementPage';
import DashboardPage from '../pages/admin/DashboardPage';
import FareManagementPage from '../pages/admin/FareManagementPage';
import PassengerHomePage from '../pages/passenger/PassengerHomePage';
import { useAuth } from '../context/AuthContext';

const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="admin-layout">
      <Sidebar />
      {children}
    </div>
  );
};

const HomeRedirect: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <div>Đang kiểm tra phiên làm việc...</div>;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }
  if (user.roles.includes('ADMIN') || user.roles.includes('MANAGER')) {
    return <Navigate to="/admin/routes" replace />;
  }
  if (user.roles.includes('PASSENGER')) {
    return <Navigate to="/passenger/booking" replace />;
  }
  return <Navigate to="/unauthorized" replace />;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Trang xác thực / Đăng nhập: PublicRoute chỉ cho phép khi chưa đăng nhập */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <AuthLayout>
              <LoginPage />
            </AuthLayout>
          </PublicRoute>
        }
      />

      {/* Phân hệ Quản trị / Điều hành: Yêu cầu quyền ADMIN hoặc MANAGER */}
      <Route path="/admin" element={<ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']} />}>
        <Route index element={<Navigate to="/admin/routes" replace />} />
        <Route
          path="dashboard"
          element={
            <AdminLayout>
              <DashboardPage />
            </AdminLayout>
          }
        />
        <Route
          path="routes"
          element={
            <AdminLayout>
              <RouteManagementPage />
            </AdminLayout>
          }
        />
        <Route
          path="fares"
          element={
            <AdminLayout>
              <FareManagementPage />
            </AdminLayout>
          }
        />
      </Route>

      {/* Trang báo lỗi 403 Forbidden khi thiếu quyền */}
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route
        path="/passenger/booking"
        element={
          <ProtectedRoute allowedRoles={['PASSENGER']}>
            <PassengerHomePage />
          </ProtectedRoute>
        }
      />

      {/* Điều hướng mặc định */}
      <Route path="/" element={<HomeRedirect />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default AppRoutes;

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AuthLayout from '../components/layout/AuthLayout';
import LoginPage from '../pages/auth/LoginPage';
import { ProtectedRoute } from '../components/routes/ProtectedRoute';
import { PublicRoute } from '../components/routes/PublicRoute';
import UnauthorizedPage from '../pages/error/UnauthorizedPage';
import Sidebar from '../components/admin/Sidebar';
import RouteManagementPage from '../pages/admin/RouteManagementPage';

const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="admin-layout">
      <Sidebar />
      {children}
    </div>
  );
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
      <Route
        path="/admin"
        element={<ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']} />}
      >
        <Route index element={<Navigate to="/admin/routes" replace />} />
        <Route
          path="routes"
          element={
            <AdminLayout>
              <RouteManagementPage />
            </AdminLayout>
          }
        />
      </Route>

      {/* Trang báo lỗi 403 Forbidden khi thiếu quyền */}
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* Điều hướng mặc định */}
      <Route path="/" element={<Navigate to="/admin/routes" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default AppRoutes;

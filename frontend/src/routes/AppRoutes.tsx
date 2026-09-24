import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthLayout } from '../components/layout/AuthLayout';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { UnauthorizedPage } from '../pages/error/UnauthorizedPage';
import { ProtectedRoute } from '../components/routes/ProtectedRoute';
import { PublicRoute } from '../components/routes/PublicRoute';

// Dashboards
import { AdminDashboard } from '../pages/dashboard/AdminDashboard';
import { ManagerDashboard } from '../pages/dashboard/ManagerDashboard';
import { DriverDashboard } from '../pages/dashboard/DriverDashboard';
import { PassengerDashboard } from '../pages/dashboard/PassengerDashboard';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* 1. PUBLIC ROUTES (Chỉ cho phép khi chưa đăng nhập) */}
      <Route element={<PublicRoute />}>
        <Route
          path="/login"
          element={
            <AuthLayout>
              <LoginPage />
            </AuthLayout>
          }
        />
        <Route
          path="/register"
          element={
            <AuthLayout>
              <RegisterPage />
            </AuthLayout>
          }
        />
      </Route>

      {/* 2. ERROR ROUTE (403 Forbidden) */}
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* 3. PROTECTED ROUTES - HÀNH KHÁCH (PASSENGER) */}
      <Route element={<ProtectedRoute allowedRoles={['PASSENGER', 'ADMIN']} />}>
        <Route path="/passenger/booking" element={<PassengerDashboard />} />
      </Route>

      {/* 4. PROTECTED ROUTES - TÀI XẾ / PHỤ XE (DRIVER) - Quét vé QR */}
      <Route element={<ProtectedRoute allowedRoles={['DRIVER', 'ADMIN']} />}>
        <Route path="/driver/scanner" element={<DriverDashboard />} />
      </Route>

      {/* 5. PROTECTED ROUTES - QUẢN LÝ (MANAGER) - Báo cáo & Lập lịch */}
      <Route element={<ProtectedRoute allowedRoles={['MANAGER', 'ADMIN']} />}>
        <Route path="/manager/reports" element={<ManagerDashboard />} />
      </Route>

      {/* 6. PROTECTED ROUTES - ADMIN - Phân quyền tài khoản (US 22) */}
      <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
        <Route path="/admin/users" element={<AdminDashboard />} />
      </Route>

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

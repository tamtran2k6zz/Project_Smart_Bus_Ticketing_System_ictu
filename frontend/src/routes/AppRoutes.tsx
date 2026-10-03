import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AuthLayout from '../components/layout/AuthLayout';
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import HomePage from '../pages/home/HomePage';
import SearchResultsPage from '../pages/trips/SearchResultsPage';
import { ProtectedRoute } from '../components/routes/ProtectedRoute';
import { PublicRoute } from '../components/routes/PublicRoute';
import UnauthorizedPage from '../pages/error/UnauthorizedPage';
import RouteManagementPage from '../pages/admin/RouteManagementPage';
import DriverPortalPage from '../pages/driver/DriverPortalPage';
import PassengerPortalPage from '../pages/passenger/PassengerPortalPage';
import DriverTripDetailPage from '../pages/driver/DriverTripDetailPage';
import PaymentPage from '../pages/payment/PaymentPage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* US 01: Trang chủ với thanh tra cứu chuyến xe (Công khai) */}
      <Route path="/" element={<HomePage />} />


      {/* US 01: Trang kết quả tìm kiếm chuyến xe theo điểm đi, điểm đến, ngày */}
      <Route path="/search" element={<SearchResultsPage />} />

      {/* Chọn cổng thanh toán VNPay / MoMo (cần đăng nhập) */}
      <Route element={<ProtectedRoute allowedRoles={['PASSENGER', 'ADMIN', 'MANAGER']} />}>
        <Route path="/payment" element={<PaymentPage />} />
      </Route>

      {/* US 22: Trang xác thực / Đăng nhập: PublicRoute chỉ cho phép khi chưa đăng nhập */}
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

      {/* US 22: Trang đăng ký tài khoản khách hàng mới */}
      <Route
        path="/register"
        element={
          <PublicRoute>
            <AuthLayout>
              <RegisterPage />
            </AuthLayout>
          </PublicRoute>
        }
      />

      {/* US 12 & US 22: Phân hệ Quản trị (Admin & Quản lý): CRUD Tuyến, Trạm, Gán trạm */}
      <Route
        path="/admin"
        element={<ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']} />}
      >
        <Route index element={<Navigate to="/admin/routes" replace />} />
        <Route path="routes" element={<RouteManagementPage />} />
      </Route>

      {/* Phân hệ Tài xế (Driver Portal): Soát vé QR & Báo cáo sự cố */}
      <Route
        path="/driver"
        element={<ProtectedRoute allowedRoles={['DRIVER', 'ADMIN', 'MANAGER']} />}
      >
        <Route index element={<Navigate to="/driver/portal" replace />} />
        <Route path="portal" element={<DriverPortalPage />} />
        <Route path="trip-detail" element={<DriverTripDetailPage />} />
      </Route>

      {/* Phân hệ Hành khách (Passenger Portal): Đặt vé & Sơ đồ ghế */}
      <Route
        path="/passenger"
        element={<ProtectedRoute allowedRoles={['PASSENGER', 'ADMIN', 'MANAGER']} />}
      >
        <Route index element={<Navigate to="/passenger/booking" replace />} />
        <Route path="booking" element={<PassengerPortalPage />} />
      </Route>

      {/* Trang báo lỗi 403 Forbidden khi thiếu quyền */}
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* Điều hướng mặc định nếu route không tồn tại */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;

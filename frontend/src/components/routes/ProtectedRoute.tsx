import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { RoleCode } from '../../types/auth';
import { Spinner } from '../common/Spinner';

interface ProtectedRouteProps {
  allowedRoles?: RoleCode[];
  children?: React.ReactElement;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { isAuthenticated, isLoading, hasRole } = useAuth();
  const location = useLocation();

  // Đang khôi phục phiên đăng nhập từ LocalStorage
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        height: '100vh',
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc',
      }}>
        <Spinner size="lg" color="#2563eb" text="Đang tải phiên làm việc Smart Bus..." />
      </div>
    );
  }

  // Chưa đăng nhập -> Chuyển hướng tới trang Đăng nhập kèm đường dẫn đích
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Đã đăng nhập nhưng không có vai trò hợp lệ -> Chuyển hướng 403 Forbidden
  if (allowedRoles && allowedRoles.length > 0 && !hasRole(allowedRoles)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children ? children : <Outlet />;
};

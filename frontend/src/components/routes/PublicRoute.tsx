import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Spinner } from '../common/Spinner';

interface PublicRouteProps {
  children?: React.ReactElement;
}

export const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

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
        <Spinner size="lg" color="#2563eb" text="Đang khởi tạo hệ thống..." />
      </div>
    );
  }

  // Đã đăng nhập -> Điều hướng thông minh theo vai trò
  if (isAuthenticated && user) {
    const roles = user.roles || [];
    if (roles.includes('ADMIN')) {
      return <Navigate to="/admin/users" replace />;
    }
    if (roles.includes('MANAGER')) {
      return <Navigate to="/manager/reports" replace />;
    }
    if (roles.includes('DRIVER')) {
      return <Navigate to="/driver/scanner" replace />;
    }
    return <Navigate to="/passenger/booking" replace />;
  }

  return children ? children : <Outlet />;
};

import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface PublicRouteProps {
  children?: React.ReactElement;
}

export const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <span>Đang khởi tạo...</span>
      </div>
    );
  }

  // Đã đăng nhập -> Điều hướng vào trang tương ứng
  if (isAuthenticated && user) {
    const roles = user.roles || [];
    if (roles.includes('ADMIN') || roles.includes('MANAGER')) {
      return <Navigate to="/admin/routes" replace />;
    }
    if (roles.includes('PASSENGER')) {
      return <Navigate to="/passenger/booking" replace />;
    }
    return <Navigate to="/unauthorized" replace />;
  }

  return children ? children : <Outlet />;
};

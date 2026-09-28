import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { RoleCode } from '../../types/auth';

interface ProtectedRouteProps {
  allowedRoles?: RoleCode[];
  children?: React.ReactElement;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { isAuthenticated, isLoading, hasRole } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <span>Đang kiểm tra phiên làm việc...</span>
      </div>
    );
  }

  // Chưa đăng nhập -> Chuyển về login kèm location
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Không đúng vai trò -> Chuyển về trang 403
  if (allowedRoles && allowedRoles.length > 0 && !hasRole(allowedRoles)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children ? children : <Outlet />;
};

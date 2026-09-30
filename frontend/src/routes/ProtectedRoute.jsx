import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';

export const ProtectedRoute = ({ allowedRoles = null, children = null }) => {
  const { isAuthenticated, isLoading, user, hasRole } = useAuth();
  const location = useLocation();

  // Show loading indicator while session is being verified
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <LoadingSpinner size="lg" color="primary" />
        <p className="text-sm font-medium text-slate-600 animate-pulse">
          Đang xác thực phiên làm việc...
        </p>
      </div>
    );
  }

  // Not logged in -> Redirect to login page and remember original destination
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role authorization if roles are specified
  if (allowedRoles && !hasRole(allowedRoles)) {
    return (
      <Navigate
        to="/403"
        state={{
          requiredRoles: allowedRoles,
          userRole: user?.role,
          from: location,
        }}
        replace
      />
    );
  }

  return children ? children : <Outlet />;
};

export default ProtectedRoute;

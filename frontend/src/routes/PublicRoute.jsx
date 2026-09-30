import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';

export const PublicRoute = ({ children = null }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <LoadingSpinner size="lg" color="primary" />
      </div>
    );
  }

  // If already authenticated, redirect to destination or dashboard
  if (isAuthenticated) {
    const redirectPath = location.state?.from?.pathname || '/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  return children ? children : <Outlet />;
};

export default PublicRoute;

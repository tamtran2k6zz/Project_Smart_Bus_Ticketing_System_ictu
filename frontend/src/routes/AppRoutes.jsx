import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Layouts
import AuthLayout from '../layouts/AuthLayout';
import AppLayout from '../layouts/AppLayout';

// Route Guards
import ProtectedRoute from './ProtectedRoute';
import PublicRoute from './PublicRoute';

// Pages
import HomePage from '../pages/HomePage';
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';
import DashboardPage from '../pages/dashboard/DashboardPage';
import AdminDashboardPage from '../pages/admin/AdminDashboardPage';
import AdminBookingsPage from '../pages/admin/AdminBookingsPage';
import AdminRevenueReconciliationPage from '../pages/admin/AdminRevenueReconciliationPage';
import AdminSchedulesPage from '../pages/admin/AdminSchedulesPage';
import AdminMonthlyTicketsPage from '../pages/admin/AdminMonthlyTicketsPage';
import TicketsPage from '../pages/tickets/TicketsPage';
import ProfilePage from '../pages/profile/ProfilePage';
import ForbiddenPage from '../pages/error/ForbiddenPage';
import NotFoundPage from '../pages/error/NotFoundPage';

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Pages inside Main App Layout */}
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/403" element={<ForbiddenPage />} />
      </Route>

      {/* Auth Pages inside Dedicated Auth Layout (Guest only) */}
      <Route element={<AuthLayout />}>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPasswordPage />
            </PublicRoute>
          }
        />
      </Route>

      {/* Authenticated Protected Routes inside Main App Layout */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/tickets" element={<TicketsPage />} />
          <Route path="/profile" element={<ProfilePage />} />

          {/* Admin Role-Protected Route */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/bookings" element={<AdminBookingsPage />} />
            <Route path="/admin/transactions" element={<AdminBookingsPage />} />
            <Route path="/admin/reconciliation" element={<AdminRevenueReconciliationPage />} />
            <Route path="/admin/revenue" element={<AdminRevenueReconciliationPage />} />
            <Route path="/admin/schedules" element={<AdminSchedulesPage />} />
            <Route path="/admin/monthly-tickets" element={<AdminMonthlyTicketsPage />} />
          </Route>
        </Route>
      </Route>

      {/* Catch-all 404 Route */}
      <Route element={<AppLayout />}>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes;

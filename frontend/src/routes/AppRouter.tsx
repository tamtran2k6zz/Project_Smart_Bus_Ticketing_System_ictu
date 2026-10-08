import { lazy, Suspense, useEffect } from 'react';
import { Route, Routes, Navigate, useLocation } from 'react-router-dom';
import MainLayout from '@/layouts/MainLayout';
import AuthLayout from '@/layouts/AuthLayout';
import PassengerLayout from '@/layouts/PassengerLayout';
import AdminLayout from '@/layouts/AdminLayout';
import StaffLayout from '@/layouts/StaffLayout';
import ProtectedRoute from './ProtectedRoute';
import PermissionGuard from './PermissionGuard';
import type { Permission } from '@/features/auth/types';
import type { Resource } from '@/features/operations/services/operations.api';
import { paths } from '@/configs/routes';
const LandingPage = lazy(() => import('@/pages/LandingPage'));
const TripsPage = lazy(() => import('@/pages/TripsPage'));
const AuthPage = lazy(() => import('@/pages/AuthPage'));
const BookingPage = lazy(() => import('@/pages/BookingPage'));
const PaymentPage = lazy(() => import('@/pages/PaymentPage'));
const TicketsPage = lazy(() => import('@/pages/TicketsPage'));
const TrackingPage = lazy(() => import('@/pages/TrackingPage'));
const AccountPage = lazy(() => import('@/pages/AccountPage'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const AdminResourcePage = lazy(() => import('@/pages/AdminResourcePage'));
const AdminPage = lazy(() => import('@/pages/AdminPage'));
const ReportsPage = lazy(() => import('@/pages/ReportsPage'));
const StaffPage = lazy(() => import('@/pages/StaffPage'));
const StatusPage = lazy(() => import('@/pages/StatusPage'));
const resources: { path: string; resource: Resource }[] = [
  { path: 'routes', resource: 'routes' },
  { path: 'stops', resource: 'stops' },
  { path: 'schedules', resource: 'trips' },
  { path: 'vehicles', resource: 'vehicles' },
  { path: 'staff', resource: 'staff' },
  { path: 'assignments', resource: 'assignments' },
];
function ScrollOnRoute() {
  const location = useLocation();
  useEffect(() => {
    if (location.hash) {
      requestAnimationFrame(() =>
        document.getElementById(location.hash.slice(1))?.scrollIntoView()
      );
    } else {
      window.scrollTo(0, 0);
      document.getElementById('main')?.focus();
    }
  }, [location.pathname, location.hash]);
  return null;
}
export default function AppRouter() {
  return (
    <>
      <ScrollOnRoute />
      <Suspense
        fallback={
          <div className="container" role="status" style={{ padding: 45 }}>
            Đang mở SmartBus…
          </div>
        }
      >
        <Routes>
          <Route element={<MainLayout />}>
            <Route path={paths.home} element={<LandingPage />} />
            <Route path={paths.trips} element={<TripsPage />} />
            <Route path="/trips/:tripId" element={<TripsPage detail />} />
            <Route path="/tracking/:tripId" element={<TrackingPage />} />
            <Route path="/403" element={<StatusPage code={403} />} />
            <Route path="*" element={<StatusPage code={404} />} />
          </Route>
          <Route element={<AuthLayout />}>
            <Route path={paths.login} element={<AuthPage mode="login" />} />
            <Route path={paths.register} element={<AuthPage mode="register" />} />
            <Route path={paths.forgot} element={<AuthPage mode="forgot" />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route element={<PassengerLayout />}>
              <Route path="/booking/:tripId" element={<BookingPage />} />
              <Route path="/checkout/:bookingId" element={<PaymentPage />} />
              <Route path="/payment/result" element={<PaymentPage result />} />
              <Route path={paths.tickets} element={<TicketsPage />} />
              <Route path="/account/tickets/:ticketId" element={<TicketsPage detail />} />
              {(['passes', 'notifications', 'support', 'profile'] as const).map(section => (
                <Route
                  key={section}
                  path={'/account/' + section}
                  element={<AccountPage section={section} />}
                />
              ))}
            </Route>
            <Route element={<PermissionGuard roles={['ADMIN', 'MANAGER', 'FINANCE']} />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<DashboardPage />} />
                <Route element={<PermissionGuard permission="operations" />}>
                  {resources.map(r => (
                    <Route
                      key={r.path}
                      path={r.path}
                      element={<AdminResourcePage resource={r.resource} />}
                    />
                  ))}
                </Route>
                <Route element={<PermissionGuard permission="reports" />}>
                  <Route path="reports" element={<ReportsPage />} />
                </Route>
                {(
                  [
                    { section: 'promotions', path: 'promotions', permission: 'promotions' },
                    { section: 'eligibility', path: 'eligibility', permission: 'eligibility' },
                    { section: 'users', path: 'users', permission: 'users' },
                    { section: 'audit', path: 'audit-logs', permission: 'audit' },
                    { section: 'support', path: 'support', permission: 'support' },
                  ] as {
                    section: 'promotions' | 'eligibility' | 'users' | 'audit' | 'support';
                    path: string;
                    permission: Permission;
                  }[]
                ).map(r => (
                  <Route key={r.path} element={<PermissionGuard permission={r.permission} />}>
                    <Route path={r.path} element={<AdminPage section={r.section} />} />
                  </Route>
                ))}
                <Route path="vouchers" element={<Navigate to="/admin/promotions" replace />} />
              </Route>
            </Route>
            <Route
              element={
                <PermissionGuard permission="check-in" roles={['DRIVER', 'MANAGER', 'ADMIN']} />
              }
            >
              <Route path="/staff" element={<StaffLayout />}>
                <Route index element={<Navigate to="/staff/trips" replace />} />
                {(['trips', 'scan', 'incidents'] as const).map(section => (
                  <Route key={section} path={section} element={<StaffPage section={section} />} />
                ))}
              </Route>
            </Route>
          </Route>
          <Route path="/search" element={<LegacyRedirect to="/trips" />} />
          <Route path="/passenger/booking" element={<Navigate to="/trips" replace />} />
          <Route path="/driver/portal" element={<Navigate to="/staff/trips" replace />} />
          <Route path="/unauthorized" element={<Navigate to="/403" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}
function LegacyRedirect({ to }: { to: string }) {
  const location = useLocation();
  return <Navigate to={to + location.search} replace />;
}

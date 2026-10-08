import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Component, lazy, Suspense, type ReactNode } from 'react';
import { queryClient } from '@/services/queryClient';
import AppRouter from '@/routes/AppRouter';
const LegacyApp = lazy(() => import('./legacy-entry'));
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    return this.state.error ? (
      <div className="container" role="alert" style={{ padding: 50 }}>
        <h1>Không thể hiển thị SmartBus</h1>
        <p>{this.state.error.message}</p>
        <button onClick={() => window.location.reload()}>Tải lại trang</button>
        <a href="/">Về trang chủ</a>
      </div>
    ) : (
      this.props.children
    );
  }
}
export default function App() {
  if (import.meta.env.VITE_LEGACY_APP === 'true')
    return (
      <Suspense fallback="Đang mở giao diện cũ…">
        <LegacyApp />
      </Suspense>
    );
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <a className="skipLink" href="#main">
            Bỏ qua tới nội dung
          </a>
          <AppRouter />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NetworkStatusProvider, useNetworkStatus } from '../contexts/NetworkStatusContext';
import { AuthProvider } from '../contexts/AuthContext';
import AppLayout from '../layouts/AppLayout';
import OfflineBanner from '../components/common/OfflineBanner';
import Navbar from '../components/navigation/Navbar';

// Helper component that exposes network switch for tests
const NetworkTestConsumer = () => {
  const { isOnline, checkConnection } = useNetworkStatus();
  return (
    <div data-testid="network-consumer">
      <span data-testid="consumer-status">{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
      <button type="button" data-testid="consumer-check-btn" onClick={() => checkConnection()}>
        Check
      </button>
    </div>
  );
};

describe('STT 43 (Ngày 10 - Thứ 6): Tinh chỉnh độ mượt giao diện, xử lý lỗi hiển thị di động và mất kết nối mạng', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const renderWithProviders = (ui, { initialEntries = ['/'] } = {}) => {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        <NetworkStatusProvider>
          <AuthProvider>{ui}</AuthProvider>
        </NetworkStatusProvider>
      </MemoryRouter>
    );
  };

  it('detects network offline event and renders persistent offline notification banner', async () => {
    renderWithProviders(
      <>
        <OfflineBanner />
        <NetworkTestConsumer />
      </>
    );

    // Initially online
    expect(screen.getByTestId('consumer-status').textContent).toBe('ONLINE');
    expect(screen.queryByTestId('offline-banner')).not.toBeInTheDocument();

    // Trigger offline event on window
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    // Offline banner should now be visible with clear instructions
    await waitFor(() => {
      expect(screen.getByTestId('offline-banner')).toBeInTheDocument();
      expect(screen.getByText(/mất kết nối internet/i)).toBeInTheDocument();
      expect(screen.getByText(/chế độ ngoại tuyến/i)).toBeInTheDocument();
      expect(screen.getByTestId('btn-retry-connection')).toBeInTheDocument();
    });

    expect(screen.getByTestId('consumer-status').textContent).toBe('OFFLINE');
  });

  it('allows user to click retry connection button while offline', async () => {
    renderWithProviders(
      <>
        <OfflineBanner />
        <NetworkTestConsumer />
      </>
    );

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('offline-banner')).toBeInTheDocument();
    });

    const retryBtn = screen.getByTestId('btn-retry-connection');
    expect(retryBtn).toBeInTheDocument();

    // User clicks retry button
    await act(async () => {
      fireEvent.click(retryBtn);
    });
  });

  it('renders reconnected success banner when network is restored and allows manual dismiss', async () => {
    renderWithProviders(
      <>
        <OfflineBanner />
        <NetworkTestConsumer />
      </>
    );

    // Go offline first
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('offline-banner')).toBeInTheDocument();
    });

    // Network is restored!
    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    // Reconnected banner appears
    await waitFor(() => {
      expect(screen.queryByTestId('offline-banner')).not.toBeInTheDocument();
      expect(screen.getByTestId('reconnected-banner')).toBeInTheDocument();
      expect(screen.getByText(/đã khôi phục kết nối internet/i)).toBeInTheDocument();
    });

    // Dismiss reconnected banner
    const dismissBtn = screen.getByTestId('btn-dismiss-reconnected');
    fireEvent.click(dismissBtn);

    await waitFor(() => {
      expect(screen.queryByTestId('reconnected-banner')).not.toBeInTheDocument();
    });
  });

  it('renders offline indicator in Navbar when disconnected', async () => {
    renderWithProviders(<Navbar />);

    // Initially online indicator is shown
    expect(screen.getByTestId('nav-online-pill')).toBeInTheDocument();
    expect(screen.queryByTestId('nav-offline-pill')).not.toBeInTheDocument();

    // Go offline
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('nav-offline-pill')).toBeInTheDocument();
      expect(screen.getByTestId('nav-offline-pill-mobile')).toBeInTheDocument();
      expect(screen.queryByTestId('nav-online-pill')).not.toBeInTheDocument();
    });
  });

  it('handles mobile drawer navigation smoothly: opens on hamburger click, closes on backdrop click and Escape key', async () => {
    renderWithProviders(<Navbar />);

    // Mobile drawer should not be visible initially
    expect(screen.queryByTestId('mobile-nav-drawer')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mobile-drawer-backdrop')).not.toBeInTheDocument();

    const mobileMenuBtn = screen.getByTestId('mobile-menu-btn');
    expect(mobileMenuBtn).toBeInTheDocument();

    // Click to open mobile navigation
    fireEvent.click(mobileMenuBtn);

    // Mobile drawer and backdrop should appear
    await waitFor(() => {
      expect(screen.getByTestId('mobile-nav-drawer')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-drawer-backdrop')).toBeInTheDocument();
    });

    // Click backdrop to dismiss drawer
    const backdrop = screen.getByTestId('mobile-drawer-backdrop');
    fireEvent.click(backdrop);

    await waitFor(() => {
      expect(screen.queryByTestId('mobile-nav-drawer')).not.toBeInTheDocument();
      expect(screen.queryByTestId('mobile-drawer-backdrop')).not.toBeInTheDocument();
    });

    // Open again and test closing via Escape key
    fireEvent.click(mobileMenuBtn);
    await waitFor(() => {
      expect(screen.getByTestId('mobile-nav-drawer')).toBeInTheDocument();
    });

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByTestId('mobile-nav-drawer')).not.toBeInTheDocument();
    });
  });

  it('renders full AppLayout with OfflineBanner and smooth footer navigation on mobile and desktop', () => {
    renderWithProviders(<AppLayout />);

    expect(screen.getByText(/smartbus ictu/i)).toBeInTheDocument();
    expect(screen.getByText(/hỗ trợ sinh viên/i)).toBeInTheDocument();
    expect(screen.getByText(/liên hệ hỗ trợ/i)).toBeInTheDocument();
    expect(screen.getByText(/nhóm n5 - ictu/i)).toBeInTheDocument();
  });
});

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminBookingsPage from '../pages/admin/AdminBookingsPage';

describe('AdminBookingsPage (US 06: Cổng thanh toán - Màn hình Quản trị)', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <AdminBookingsPage />
      </MemoryRouter>
    );
  };

  it('renders page header, title and description correctly', async () => {
    renderComponent();

    expect(
      screen.getByRole('heading', { name: /quản lý giao dịch & danh sách vé đã đặt/i })
    ).toBeInTheDocument();
    expect(screen.getAllByText(/cổng thanh toán/i).length).toBeGreaterThan(0);

    // Wait for data load
    await waitFor(() => {
      expect(screen.getByTestId('kpi-revenue')).toBeInTheDocument();
    });
  });

  it('fulfills DoD: renders data table with required columns (mã vé, chuyến xe, số tiền, trạng thái)', async () => {
    renderComponent();

    // Wait for the table to appear
    await waitFor(() => {
      expect(screen.getByTestId('bookings-table')).toBeInTheDocument();
    });

    // Check table headers for DoD columns
    expect(screen.getByRole('columnheader', { name: /mã vé/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /chuyến xe/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /số tiền/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /trạng thái/i })).toBeInTheDocument();

    // Check row data content
    expect(screen.getByText('TCK-2026-00101')).toBeInTheDocument();
    expect(screen.getAllByText(/tuyến số 01: cổng ictu ⇄ bến xe thái nguyên/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/15\.000/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/đã thanh toán/i).length).toBeGreaterThan(0);
  });

  it('filters data by search term (ticket code or customer name)', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('bookings-table')).toBeInTheDocument();
    });

    const searchInput = screen.getByTestId('search-input');
    fireEvent.change(searchInput, { target: { value: 'TCK-2026-00102' } });

    await waitFor(() => {
      expect(screen.getByText('TCK-2026-00102')).toBeInTheDocument();
      expect(screen.queryByText('TCK-2026-00101')).not.toBeInTheDocument();
    });
  });

  it('filters data by status filter dropdown', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('bookings-table')).toBeInTheDocument();
    });

    const statusSelect = screen.getByTestId('status-filter');
    fireEvent.change(statusSelect, { target: { value: 'PENDING' } });

    await waitFor(() => {
      expect(screen.getByText('TCK-2026-00103')).toBeInTheDocument();
      expect(screen.queryByText('TCK-2026-00101')).not.toBeInTheDocument();
    });
  });

  it('filters data by payment method filter dropdown', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('bookings-table')).toBeInTheDocument();
    });

    const paymentSelect = screen.getByTestId('payment-filter');
    fireEvent.change(paymentSelect, { target: { value: 'MOMO' } });

    await waitFor(() => {
      expect(screen.getByText('TCK-2026-00102')).toBeInTheDocument();
      expect(screen.queryByText('TCK-2026-00101')).not.toBeInTheDocument();
    });
  });

  it('opens details modal when clicking Chi tiết button', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('bookings-table')).toBeInTheDocument();
    });

    const detailBtn = screen.getByTestId('view-detail-btn-bkg-101');
    fireEvent.click(detailBtn);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /chi tiết vé xe & giao dịch cổng thanh toán/i })
      ).toBeInTheDocument();
      expect(screen.getByText(/cổng vnpay qr/i)).toBeInTheDocument();
      expect(screen.getByText('VNP-20260930-891024')).toBeInTheDocument();
    });

    // Close modal
    const closeBtn = screen.getByRole('button', { name: /^đóng$/i });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { name: /chi tiết vé xe & giao dịch cổng thanh toán/i })
      ).not.toBeInTheDocument();
    });
  });

  it('allows admin to approve pending transaction inside modal', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('bookings-table')).toBeInTheDocument();
    });

    // Open detail for bkg-103 which is PENDING
    const detailBtn = screen.getByTestId('view-detail-btn-bkg-103');
    fireEvent.click(detailBtn);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /duyệt thanh toán/i })).toBeInTheDocument();
    });

    const approveBtn = screen.getByRole('button', { name: /duyệt thanh toán/i });
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(screen.getByText(/cập nhật trạng thái thành công/i)).toBeInTheDocument();
    });
  });

  it('displays empty state when search finds no matches', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('bookings-table')).toBeInTheDocument();
    });

    const searchInput = screen.getByTestId('search-input');
    fireEvent.change(searchInput, { target: { value: 'NON_EXISTENT_QUERY_12345' } });

    await waitFor(() => {
      expect(screen.getByText(/không tìm thấy giao dịch nào/i)).toBeInTheDocument();
    });
  });
});

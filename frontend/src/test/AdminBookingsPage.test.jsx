import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminBookingsPage from '../pages/admin/AdminBookingsPage';

describe('AdminBookingsPage (STT 15 - US 06: Bộ lọc trạng thái vé & Phân trang dữ liệu)', () => {
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

  it('renders page header and status filter tab group', async () => {
    renderComponent();

    expect(
      screen.getByRole('heading', { name: /quản lý giao dịch & danh sách vé đã đặt/i })
    ).toBeInTheDocument();
    expect(screen.getAllByText(/cổng thanh toán/i).length).toBeGreaterThan(0);

    // Wait for data load
    await waitFor(() => {
      expect(screen.getByTestId('status-tab-group')).toBeInTheDocument();
    });

    // Check presence of status filter tabs
    expect(screen.getByTestId('filter-tab-all')).toBeInTheDocument();
    expect(screen.getByTestId('filter-tab-confirmed')).toBeInTheDocument();
    expect(screen.getByTestId('filter-tab-pending')).toBeInTheDocument();
    expect(screen.getByTestId('filter-tab-cancelled')).toBeInTheDocument();
  });

  it('fulfills DoD: filters data accurately by "Đã thanh toán" status tab', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('bookings-table')).toBeInTheDocument();
    });

    const confirmedTab = screen.getByTestId('filter-tab-confirmed');
    fireEvent.click(confirmedTab);

    await waitFor(() => {
      // All displayed items must have "Đã thanh toán"
      const statusBadges = screen.getAllByTestId(/^status-bkg-/);
      expect(statusBadges.length).toBeGreaterThan(0);
      statusBadges.forEach(badge => {
        expect(badge.textContent).toMatch(/đã thanh toán/i);
        expect(badge.textContent).not.toMatch(/đang giữ chỗ/i);
      });
    });
  });

  it('fulfills DoD: filters data accurately by "Đang giữ chỗ" status tab', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('bookings-table')).toBeInTheDocument();
    });

    const pendingTab = screen.getByTestId('filter-tab-pending');
    fireEvent.click(pendingTab);

    await waitFor(() => {
      // All displayed items must have "Đang giữ chỗ"
      const statusBadges = screen.getAllByTestId(/^status-bkg-/);
      expect(statusBadges.length).toBeGreaterThan(0);
      statusBadges.forEach(badge => {
        expect(badge.textContent).toMatch(/đang giữ chỗ/i);
        expect(badge.textContent).not.toMatch(/đã thanh toán/i);
      });
    });
  });

  it('fulfills DoD: filters data accurately by "Đã hủy" status tab', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('bookings-table')).toBeInTheDocument();
    });

    const cancelledTab = screen.getByTestId('filter-tab-cancelled');
    fireEvent.click(cancelledTab);

    await waitFor(() => {
      // All displayed items must be cancelled / refunded
      const statusBadges = screen.getAllByTestId(/^status-bkg-/);
      expect(statusBadges.length).toBeGreaterThan(0);
      statusBadges.forEach(badge => {
        expect(badge.textContent).toMatch(/(đã hủy|đã hoàn tiền)/i);
        expect(badge.textContent).not.toMatch(/đã thanh toán/i);
      });
    });
  });

  it('fulfills DoD: filters data using the dropdown select for status', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('bookings-table')).toBeInTheDocument();
    });

    const statusSelect = screen.getByTestId('status-filter');
    fireEvent.change(statusSelect, { target: { value: 'PENDING' } });

    await waitFor(() => {
      const statusBadges = screen.getAllByTestId(/^status-bkg-/);
      expect(statusBadges.length).toBeGreaterThan(0);
      statusBadges.forEach(badge => {
        expect(badge.textContent).toMatch(/đang giữ chỗ/i);
      });
    });
  });

  it('fulfills DoD: supports pagination and page navigation', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('pagination-bar')).toBeInTheDocument();
    });

    // Check initial page 1
    expect(screen.getByTestId('pagination-summary').textContent).toContain('1 - 5');

    // Click Next page button
    const nextBtn = screen.getByRole('button', { name: /trang sau/i });
    expect(nextBtn).toBeEnabled();
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(screen.getByTestId('pagination-summary').textContent).toContain('6 - 10');
    });

    // Click Previous page button
    const prevBtn = screen.getByRole('button', { name: /trang trước/i });
    expect(prevBtn).toBeEnabled();
    fireEvent.click(prevBtn);

    await waitFor(() => {
      expect(screen.getByTestId('pagination-summary').textContent).toContain('1 - 5');
    });
  });

  it('navigates directly to page 2 via numbered page button and resets on filter change', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('page-btn-2')).toBeInTheDocument();
    });

    // Jump to page 2
    fireEvent.click(screen.getByTestId('page-btn-2'));

    await waitFor(() => {
      expect(screen.getByTestId('pagination-summary').textContent).toContain('6 - 10');
    });

    // Now switch status filter; current page should automatically reset to 1
    const pendingTab = screen.getByTestId('filter-tab-pending');
    fireEvent.click(pendingTab);

    await waitFor(() => {
      expect(screen.getByTestId('pagination-summary').textContent).toContain('1 -');
    });
  });

  it('changes items per page selector and updates pagination', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('items-per-page')).toBeInTheDocument();
    });

    const itemsSelect = screen.getByTestId('items-per-page');
    fireEvent.change(itemsSelect, { target: { value: '10' } });

    await waitFor(() => {
      expect(screen.getByTestId('pagination-summary').textContent).toContain('1 - 10');
    });
  });

  it('opens details modal when clicking Chi tiết button and closes properly', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('bookings-table')).toBeInTheDocument();
    });

    const detailButtons = screen.getAllByRole('button', { name: /xem chi tiết vé/i });
    expect(detailButtons.length).toBeGreaterThan(0);
    fireEvent.click(detailButtons[0]);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /chi tiết vé xe & giao dịch cổng thanh toán/i })
      ).toBeInTheDocument();
    });

    const closeBtn = screen.getByRole('button', { name: /^đóng$/i });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { name: /chi tiết vé xe & giao dịch cổng thanh toán/i })
      ).not.toBeInTheDocument();
    });
  });
});

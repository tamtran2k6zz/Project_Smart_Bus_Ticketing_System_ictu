import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminRevenueReconciliationPage from '../pages/admin/AdminRevenueReconciliationPage';

describe('AdminRevenueReconciliationPage (STT 25 - US 06: Quản lý đối soát doanh thu vé theo ngày và theo chuyến)', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <AdminRevenueReconciliationPage />
      </MemoryRouter>
    );
  };

  it('renders page header, title and description', async () => {
    renderComponent();

    expect(
      screen.getByRole('heading', { name: /quản lý đối soát doanh thu vé theo ngày & chuyến xe/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/us 06: cổng thanh toán • đối soát doanh thu \(stt 25\)/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('daily-reconciliation-table')).toBeInTheDocument();
    });
  });

  it('fulfills DoD: displays KPI cards for Tổng doanh thu, Số vé đã bán, and Số vé đã hủy theo ngày', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('kpi-daily-revenue')).toBeInTheDocument();
      expect(screen.getByTestId('kpi-daily-sold')).toBeInTheDocument();
      expect(screen.getByTestId('kpi-daily-cancelled')).toBeInTheDocument();
    });

    const revenueKpi = screen.getByTestId('kpi-daily-revenue');
    const soldKpi = screen.getByTestId('kpi-daily-sold');
    const cancelledKpi = screen.getByTestId('kpi-daily-cancelled');

    // Revenue KPI should contain currency symbol or VND formatting
    expect(revenueKpi.textContent).toMatch(/₫|đ/i);

    // Sold KPI should contain number of tickets
    expect(soldKpi.textContent).toMatch(/\d+\s*vé/i);

    // Cancelled KPI should contain number of cancelled tickets
    expect(cancelledKpi.textContent).toMatch(/\d+\s*vé/i);
  });

  it('displays the daily reconciliation table with required columns and data rows', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('daily-reconciliation-table')).toBeInTheDocument();
    });

    const table = screen.getByTestId('daily-reconciliation-table');
    const withinTable = within(table);

    // Check table headers
    expect(withinTable.getByText(/^ngày đối soát$/i)).toBeInTheDocument();
    expect(withinTable.getByText(/^tổng doanh thu$/i)).toBeInTheDocument();
    expect(withinTable.getByText(/^số vé đã bán$/i)).toBeInTheDocument();
    expect(withinTable.getByText(/^số vé đã hủy$/i)).toBeInTheDocument();

    // Check presence of daily rows
    const rows = screen.getAllByTestId(/^daily-row-/);
    expect(rows.length).toBeGreaterThan(0);
  });

  it('allows switching to "Đối soát theo chuyến xe" tab and renders trip table', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('tab-view-trip')).toBeInTheDocument();
    });

    const tripTab = screen.getByTestId('tab-view-trip');
    fireEvent.click(tripTab);

    await waitFor(() => {
      expect(screen.getByTestId('trip-reconciliation-table')).toBeInTheDocument();
    });

    const tripTable = screen.getByTestId('trip-reconciliation-table');
    const withinTripTable = within(tripTable);

    // Check trip table headers
    expect(withinTripTable.getByText(/^mã chuyến$/i)).toBeInTheDocument();
    expect(withinTripTable.getByText(/^xe & lái xe$/i)).toBeInTheDocument();
    expect(withinTripTable.getByText(/^lấp đầy$/i)).toBeInTheDocument();
    expect(withinTripTable.getByText(/^doanh thu chuyến$/i)).toBeInTheDocument();

    // Verify trip code row
    expect(withinTripTable.getByText('ICTU-TRP-010')).toBeInTheDocument();
  });

  it('filters data when date range changes', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('daily-reconciliation-table')).toBeInTheDocument();
    });

    const select = screen.getByTestId('date-range-filter');
    fireEvent.change(select, { target: { value: 'TODAY' } });

    await waitFor(() => {
      const rows = screen.getAllByTestId(/^daily-row-/);
      expect(rows.length).toBe(1);
      expect(screen.getByTestId('daily-row-2026-09-30')).toBeInTheDocument();
      expect(screen.queryByTestId('daily-row-2026-09-29')).not.toBeInTheDocument();
    });
  });

  it('opens and closes the reconciliation day detail modal', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('btn-view-detail-rec-2026-09-30')).toBeInTheDocument();
    });

    const detailBtn = screen.getByTestId('btn-view-detail-rec-2026-09-30');
    fireEvent.click(detailBtn);

    await waitFor(() => {
      expect(screen.getByTestId('day-detail-modal')).toBeInTheDocument();
      expect(screen.getByText(/chi tiết đối soát ngày/i)).toBeInTheDocument();
    });

    const closeBtn = screen.getByTestId('close-modal');
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByTestId('day-detail-modal')).not.toBeInTheDocument();
    });
  });

  it('triggers CSV export without crashing', async () => {
    const clickMock = vi.fn();
    const origClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = clickMock;

    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /xuất báo cáo csv/i })).toBeInTheDocument();
    });

    const exportBtn = screen.getByRole('button', { name: /xuất báo cáo csv/i });
    expect(() => fireEvent.click(exportBtn)).not.toThrow();

    HTMLAnchorElement.prototype.click = origClick;
  });
});

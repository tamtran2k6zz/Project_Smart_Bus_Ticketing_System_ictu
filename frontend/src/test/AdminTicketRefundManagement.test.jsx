import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminBookingsPage from '../pages/admin/AdminBookingsPage';

describe('AdminTicketRefundManagement (US 05 - STT 35: Màn hình Xem chi tiết vé & Nút thao tác Hủy vé / Duyệt hoàn tiền)', () => {
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

  it('fulfills DoD 1: Admin can open and view comprehensive ticket details', async () => {
    renderComponent();

    // Wait for table to load
    await waitFor(() => {
      expect(screen.getByTestId('bookings-table')).toBeInTheDocument();
    });

    // Search for TCK-2026-00101
    const searchInput = screen.getByTestId('search-input');
    fireEvent.change(searchInput, { target: { value: 'TCK-2026-00101' } });

    // Wait for bkg-101 row to appear
    await waitFor(() => {
      expect(screen.getByTestId('view-detail-btn-bkg-101')).toBeInTheDocument();
    });

    // Click "Chi tiết" on the ticket (bkg-101)
    const viewDetailBtn = screen.getByTestId('view-detail-btn-bkg-101');
    fireEvent.click(viewDetailBtn);

    // Verify modal is open and displays full ticket breakdown scoped to dialog
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    const dialog = screen.getByRole('dialog');
    const modalWithin = within(dialog);

    expect(modalWithin.getByText('TCK-2026-00101')).toBeInTheDocument();
    expect(modalWithin.getByText(/bk-ictu-8921/i)).toBeInTheDocument();
    expect(modalWithin.getByText('Nguyễn Hoàng Đức')).toBeInTheDocument();
    expect(modalWithin.getByText('0981 234 567')).toBeInTheDocument();
    expect(modalWithin.getByText(/tuyến số 01: cổng ictu ⇄ bến xe thái nguyên/i)).toBeInTheDocument();
    expect(modalWithin.getByText(/20b-123.45/i)).toBeInTheDocument();

    // Close the modal
    const closeBtn = screen.getByTestId('close-detail-modal');
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('renders US 05 pending refund banner and allows quick filtering', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('banner-pending-refunds')).toBeInTheDocument();
    });

    const banner = screen.getByTestId('banner-pending-refunds');
    fireEvent.click(banner);

    // Should activate the "Chờ duyệt hoàn tiền" filter
    await waitFor(() => {
      const activeTab = screen.getByTestId('filter-tab-refund-requested');
      expect(activeTab.className).toContain('bg-rose-600');
    });
  });

  it('fulfills DoD 2: Admin views ticket refund request and approves passenger refund', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('bookings-table')).toBeInTheDocument();
    });

    // Switch to "Chờ duyệt hoàn tiền (US 05)" tab
    const refundTab = screen.getByTestId('filter-tab-refund-requested');
    fireEvent.click(refundTab);

    // Verify bkg-114 is displayed with status "Chờ duyệt hoàn tiền"
    await waitFor(() => {
      expect(screen.getByTestId('view-detail-btn-bkg-114')).toBeInTheDocument();
    });

    // Open detail modal for bkg-114
    const detailBtn = screen.getByTestId('view-detail-btn-bkg-114');
    fireEvent.click(detailBtn);

    // Verify refund request information is shown inside the ticket details
    await waitFor(() => {
      expect(screen.getByTestId('refund-request-info')).toBeInTheDocument();
      expect(screen.getByTestId('refund-amount')).toBeInTheDocument();
      expect(screen.getByText(/bận lịch học bù môn tin học đại cương tại ictu/i)).toBeInTheDocument();
      expect(screen.getByTestId('btn-approve-refund')).toBeInTheDocument();
    });

    // Click "Duyệt hoàn tiền"
    const approveBtn = screen.getByTestId('btn-approve-refund');
    fireEvent.click(approveBtn);

    // Verify approval confirmation form is rendered
    await waitFor(() => {
      expect(screen.getByTestId('approve-refund-form')).toBeInTheDocument();
      expect(screen.getByTestId('input-refund-amount')).toBeInTheDocument();
      expect(screen.getByTestId('confirm-approve-refund')).toBeInTheDocument();
    });

    // Submit confirmation
    const confirmBtn = screen.getByTestId('confirm-approve-refund');
    fireEvent.click(confirmBtn);

    // Verify status changes to "Đã hoàn tiền" and completed refund info is displayed
    await waitFor(() => {
      expect(screen.getByTestId('refund-completed-info')).toBeInTheDocument();
      expect(screen.getByText(/đã hoàn tiền thành công qua cổng thanh toán/i)).toBeInTheDocument();
    });
  });

  it('allows Admin to reject a refund request with a specific reason', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('bookings-table')).toBeInTheDocument();
    });

    // Switch to "Chờ duyệt hoàn tiền (US 05)" tab
    const refundTab = screen.getByTestId('filter-tab-refund-requested');
    fireEvent.click(refundTab);

    await waitFor(() => {
      expect(screen.getByTestId('view-detail-btn-bkg-114')).toBeInTheDocument();
    });

    const detailBtn = screen.getByTestId('view-detail-btn-bkg-114');
    fireEvent.click(detailBtn);

    await waitFor(() => {
      expect(screen.getByTestId('btn-reject-refund')).toBeInTheDocument();
    });

    // Click "Từ chối hoàn tiền"
    const rejectBtn = screen.getByTestId('btn-reject-refund');
    fireEvent.click(rejectBtn);

    // Verify reject form opens
    await waitFor(() => {
      expect(screen.getByTestId('reject-refund-form')).toBeInTheDocument();
      expect(screen.getByTestId('input-reject-reason')).toBeInTheDocument();
    });

    // Fill in custom reason and confirm
    const reasonInput = screen.getByTestId('input-reject-reason');
    fireEvent.change(reasonInput, {
      target: { value: 'Vé yêu cầu hủy sát giờ khởi hành không hợp lệ' },
    });

    const confirmRejectBtn = screen.getByTestId('confirm-reject-refund');
    fireEvent.click(confirmRejectBtn);

    // Verify success notification and updated note
    await waitFor(() => {
      expect(screen.getByText(/đã từ chối yêu cầu hoàn tiền/i)).toBeInTheDocument();
    });
  });

  it('allows Admin to cancel a ticket directly with custom reason', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('bookings-table')).toBeInTheDocument();
    });

    // Search for TCK-2026-00102 to ensure it is visible
    const searchInput = screen.getByTestId('search-input');
    fireEvent.change(searchInput, { target: { value: 'TCK-2026-00102' } });

    await waitFor(() => {
      expect(screen.getByTestId('view-detail-btn-bkg-102')).toBeInTheDocument();
    });

    // Open detail of confirmed ticket bkg-102
    const detailBtn = screen.getByTestId('view-detail-btn-bkg-102');
    fireEvent.click(detailBtn);

    await waitFor(() => {
      expect(screen.getByTestId('btn-cancel-ticket')).toBeInTheDocument();
    });

    // Click "Hủy vé"
    const cancelBtn = screen.getByTestId('btn-cancel-ticket');
    fireEvent.click(cancelBtn);

    // Verify cancel ticket form opens
    await waitFor(() => {
      expect(screen.getByTestId('cancel-ticket-form')).toBeInTheDocument();
    });

    const reasonInput = screen.getByTestId('input-cancel-reason');
    fireEvent.change(reasonInput, { target: { value: 'Khách gọi hủy chỗ trước giờ chạy' } });

    const confirmCancelBtn = screen.getByTestId('confirm-cancel-ticket');
    fireEvent.click(confirmCancelBtn);

    // Verify status updated to CANCELLED
    await waitFor(() => {
      expect(screen.getByText(/đã hủy vé tck-2026-00102 thành công/i)).toBeInTheDocument();
    });
  });
});

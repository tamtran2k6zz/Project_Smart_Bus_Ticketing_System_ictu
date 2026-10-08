import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminSchedulesPage from '../pages/admin/AdminSchedulesPage';
import AdminMonthlyTicketsPage from '../pages/admin/AdminMonthlyTicketsPage';

describe('Admin Bus Schedules & Monthly Ticket Management ([FE 1] Lịch trình chạy xe & Form Đăng ký vé tháng trực tuyến)', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('Part 1: Quản lý Lịch trình chạy xe buýt ICTU (AdminSchedulesPage)', () => {
    const renderSchedules = () => {
      return render(
        <MemoryRouter>
          <AdminSchedulesPage />
        </MemoryRouter>
      );
    };

    it('renders schedule dashboard header, KPI stats, and schedules table', async () => {
      renderSchedules();

      // Heading & Banner
      expect(screen.getByRole('heading', { name: /quản lý lịch trình chạy xe buýt ictu/i })).toBeInTheDocument();
      expect(screen.getByTestId('btn-create-schedule')).toBeInTheDocument();

      // Wait for table to load
      await waitFor(() => {
        expect(screen.getByTestId('schedules-table')).toBeInTheDocument();
      });

      // Verify KPIs
      expect(screen.getByTestId('kpi-total-schedules')).toBeInTheDocument();
      expect(screen.getByTestId('kpi-active-schedules')).toBeInTheDocument();

      // Verify initial sample schedules are displayed
      expect(screen.getByText('SCH-ICTU-01')).toBeInTheDocument();
      expect(screen.getAllByText('20B-123.45').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Nguyễn Văn An').length).toBeGreaterThan(0);
    });

    it('filters schedule list by route code and search term', async () => {
      renderSchedules();

      await waitFor(() => {
        expect(screen.getByTestId('schedules-table')).toBeInTheDocument();
      });

      // Search for driver "Trần Văn Bình"
      const searchInput = screen.getByTestId('schedule-search-input');
      fireEvent.change(searchInput, { target: { value: 'Trần Văn Bình' } });

      await waitFor(() => {
        expect(screen.getByText('SCH-ICTU-03')).toBeInTheDocument();
        expect(screen.queryByText('SCH-ICTU-01')).not.toBeInTheDocument();
      });

      // Clear search
      fireEvent.change(searchInput, { target: { value: '' } });

      // Filter by Tuyến 03
      const routeSelect = screen.getByTestId('schedule-route-filter');
      fireEvent.change(routeSelect, { target: { value: 'TUYEN-03' } });

      await waitFor(() => {
        expect(screen.getByText('SCH-ICTU-03')).toBeInTheDocument();
        expect(screen.queryByText('SCH-ICTU-04')).not.toBeInTheDocument();
      });
    });

    it('creates a new bus schedule successfully via form modal', async () => {
      renderSchedules();

      await waitFor(() => {
        expect(screen.getByTestId('schedules-table')).toBeInTheDocument();
      });

      // Click "Thêm Lịch trình mới"
      const createBtn = screen.getByTestId('btn-create-schedule');
      fireEvent.click(createBtn);

      // Verify modal is open
      await waitFor(() => {
        expect(screen.getByTestId('schedule-form-modal')).toBeInTheDocument();
      });

      // Fill in form fields
      const tripCodeInput = screen.getByTestId('input-trip-code');
      fireEvent.change(tripCodeInput, { target: { value: 'SCH-TEST-99' } });

      const depTimeInput = screen.getByTestId('input-departure-time');
      fireEvent.change(depTimeInput, { target: { value: '05:45' } });

      const arrTimeInput = screen.getByTestId('input-arrival-time');
      fireEvent.change(arrTimeInput, { target: { value: '06:30' } });

      const busPlateInput = screen.getByTestId('input-bus-plate');
      fireEvent.change(busPlateInput, { target: { value: '20B-999.88' } });

      const driverNameInput = screen.getByTestId('input-driver-name');
      fireEvent.change(driverNameInput, { target: { value: 'Lê Văn Thắng' } });

      // Submit form
      const submitBtn = screen.getByTestId('btn-submit-schedule');
      fireEvent.click(submitBtn);

      // Verify new schedule appears in the table
      await waitFor(() => {
        expect(screen.queryByTestId('schedule-form-modal')).not.toBeInTheDocument();
        expect(screen.getByText('SCH-TEST-99')).toBeInTheDocument();
        expect(screen.getByText('20B-999.88')).toBeInTheDocument();
        expect(screen.getByText('Lê Văn Thắng')).toBeInTheDocument();
      });
    });

    it('toggles schedule status between Active and Suspended', async () => {
      renderSchedules();

      await waitFor(() => {
        expect(screen.getByTestId('schedules-table')).toBeInTheDocument();
      });

      // Initial status of sch-01 is ACTIVE
      const statusBadge = screen.getByTestId('status-sch-01');
      expect(statusBadge.textContent).toMatch(/đang hoạt động/i);

      // Toggle status button for sch-01
      const toggleBtn = screen.getByTestId('btn-toggle-status-sch-01');
      fireEvent.click(toggleBtn);

      // Status should become Tạm ngưng
      await waitFor(() => {
        const updatedBadge = screen.getByTestId('status-sch-01');
        expect(updatedBadge.textContent).toMatch(/tạm ngưng/i);
      });
    });
  });

  describe('Part 2: Quản lý & Form Đăng ký Vé tháng trực tuyến (AdminMonthlyTicketsPage)', () => {
    const renderMonthlyTickets = () => {
      return render(
        <MemoryRouter>
          <AdminMonthlyTicketsPage />
        </MemoryRouter>
      );
    };

    it('renders monthly ticket dashboard header, KPIs, and subscriptions table', async () => {
      renderMonthlyTickets();

      expect(screen.getByRole('heading', { name: /quản lý đăng ký vé tháng trực tuyến/i })).toBeInTheDocument();
      expect(screen.getByTestId('btn-open-register-modal')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByTestId('monthly-tickets-table')).toBeInTheDocument();
      });

      // Verify KPI cards
      expect(screen.getByTestId('kpi-total-subscriptions')).toBeInTheDocument();
      expect(screen.getByTestId('kpi-pending-subscriptions')).toBeInTheDocument();
      expect(screen.getByTestId('kpi-active-subscriptions')).toBeInTheDocument();
      expect(screen.getByTestId('kpi-monthly-revenue')).toBeInTheDocument();

      // Verify sample student subscriptions
      expect(screen.getByText('MTP-2026-00101')).toBeInTheDocument();
      expect(screen.getByText('Nguyễn Hoàng Đức')).toBeInTheDocument();
      expect(screen.getByText('DTC215180123')).toBeInTheDocument();
    });

    it('submits a new student monthly ticket registration with 50% discount preview', async () => {
      renderMonthlyTickets();

      await waitFor(() => {
        expect(screen.getByTestId('monthly-tickets-table')).toBeInTheDocument();
      });

      // Open registration modal
      const openModalBtn = screen.getByTestId('btn-open-register-modal');
      fireEvent.click(openModalBtn);

      await waitFor(() => {
        expect(screen.getByTestId('monthly-register-modal')).toBeInTheDocument();
      });

      // Verify 50% discount price preview for student
      expect(screen.getByTestId('preview-price').textContent).toContain('100.000');

      // Fill in student registration form
      fireEvent.change(screen.getByTestId('input-full-name'), {
        target: { value: 'Phạm Thị Thùy Linh' },
      });
      fireEvent.change(screen.getByTestId('input-student-id'), {
        target: { value: 'DTC235123999' },
      });
      fireEvent.change(screen.getByTestId('input-phone'), {
        target: { value: '0988 777 666' },
      });
      fireEvent.change(screen.getByTestId('input-email'), {
        target: { value: 'thuylinh.pt@ictu.edu.vn' },
      });

      // Submit registration
      const submitBtn = screen.getByTestId('btn-submit-monthly-registration');
      fireEvent.click(submitBtn);

      // Verify registration succeeded and new student appears in table with PENDING status
      await waitFor(() => {
        expect(screen.queryByTestId('monthly-register-modal')).not.toBeInTheDocument();
        expect(screen.getByText('Phạm Thị Thùy Linh')).toBeInTheDocument();
        expect(screen.getByText('DTC235123999')).toBeInTheDocument();
      });
    });

    it('allows Admin to view student card detail modal and approve subscription', async () => {
      renderMonthlyTickets();

      await waitFor(() => {
        expect(screen.getByTestId('monthly-tickets-table')).toBeInTheDocument();
      });

      // bkg-01 (sub-01) is initially PENDING
      const viewBtn = screen.getByTestId('btn-view-subscription-sub-01');
      fireEvent.click(viewBtn);

      // Detail modal opens
      await waitFor(() => {
        expect(screen.getByTestId('subscription-detail-modal')).toBeInTheDocument();
        expect(screen.getByText(/minh chứng thẻ sinh viên đính kèm/i)).toBeInTheDocument();
        expect(screen.getByTestId('btn-approve-subscription')).toBeInTheDocument();
      });

      // Admin clicks "Duyệt cấp thẻ vé tháng"
      const approveBtn = screen.getByTestId('btn-approve-subscription');
      fireEvent.click(approveBtn);

      // Status changes to ACTIVE
      await waitFor(() => {
        expect(screen.getByText(/đã duyệt cấp vé tháng/i)).toBeInTheDocument();
        const statusBadge = screen.getByTestId('status-sub-01');
        expect(statusBadge.textContent).toMatch(/đã kích hoạt thẻ/i);
      });
    });

    it('allows Admin to reject a monthly ticket registration with specific reason', async () => {
      renderMonthlyTickets();

      await waitFor(() => {
        expect(screen.getByTestId('monthly-tickets-table')).toBeInTheDocument();
      });

      // Open detail of sub-04 (pending)
      const viewBtn = screen.getByTestId('btn-view-subscription-sub-04');
      fireEvent.click(viewBtn);

      await waitFor(() => {
        expect(screen.getByTestId('subscription-detail-modal')).toBeInTheDocument();
        expect(screen.getByTestId('btn-reject-subscription')).toBeInTheDocument();
      });

      // Click "Từ chối duyệt"
      const rejectBtn = screen.getByTestId('btn-reject-subscription');
      fireEvent.click(rejectBtn);

      // Fill in rejection reason and confirm
      await waitFor(() => {
        expect(screen.getByTestId('input-reject-reason')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByTestId('input-reject-reason'), {
        target: { value: 'Mã số sinh viên không tồn tại trong hệ thống đào tạo' },
      });

      const confirmRejectBtn = screen.getByTestId('btn-confirm-reject');
      fireEvent.click(confirmRejectBtn);

      // Verify status changes to REJECTED
      await waitFor(() => {
        expect(screen.getByText(/đã từ chối hồ sơ vé tháng/i)).toBeInTheDocument();
        const statusBadge = screen.getByTestId('status-sub-04');
        expect(statusBadge.textContent).toMatch(/bị từ chối/i);
      });
    });
  });
});

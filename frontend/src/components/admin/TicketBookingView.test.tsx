import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { TicketBookingView } from './TicketBookingView';

const mocks = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('../../api/client', () => ({
  getApiUrl: (path: string) => path,
  apiFetch: mocks.apiFetch,
}));

beforeEach(() => {
  mocks.apiFetch.mockReset();
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockImplementation(
        async () => new Response(JSON.stringify({ success: true, data: [], tripOccupancy: [] }))
      )
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it('renders the admin tickets from a Fetch Response JSON body', async () => {
  mocks.apiFetch.mockImplementation(
    async (url: string) =>
      new Response(
        JSON.stringify(
          url.includes('/tickets/admin/all')
            ? {
                success: true,
                items: [
                  {
                    id: 'ticket-1',
                    ticketCode: 'ADMIN-TEST-001',
                    seatNumber: 'A01',
                    status: 'BOOKED',
                    createdAt: '2026-10-14T04:00:00Z',
                    userName: 'Khách kiểm thử',
                    amount: 15000,
                    paymentStatus: 'SUCCESS',
                  },
                ],
              }
            : { success: true, data: [], items: [], tripOccupancy: [] }
        )
      )
  );
  render(<TicketBookingView />);
  expect(await screen.findByText('ADMIN-TEST-001')).toBeVisible();
  expect(screen.getByText('Khách kiểm thử')).toBeVisible();
});

it('shows an API failure instead of silently showing an empty ticket list', async () => {
  mocks.apiFetch.mockImplementation(
    async (url: string) =>
      new Response(
        JSON.stringify(
          url.includes('/tickets/admin/all')
            ? { success: false, message: 'Không thể tải vé kiểm thử.' }
            : { success: true, data: [], items: [], tripOccupancy: [] }
        ),
        { status: url.includes('/tickets/admin/all') ? 503 : 200 }
      )
  );
  render(<TicketBookingView />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Không thể tải vé kiểm thử.');
});

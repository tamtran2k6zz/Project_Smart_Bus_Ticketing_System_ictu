import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSession } from '@/store/session.store';
import { getBookingDraftStore } from '@/store/booking.store';
import { ApiError } from '@/services/http';
import { BookingFlow } from './BookingFlow';
import type { Hold } from '../types';
const api = vi.hoisted(() => ({
  trip: vi.fn(),
  seats: vi.fn(),
  hold: vi.fn(),
  createHold: vi.fn(),
  release: vi.fn(),
  createBooking: vi.fn(),
  activeVouchers: vi.fn(),
  catalog: vi.fn(),
}));
vi.mock('../services/booking.api', () => ({ bookingApi: api }));
vi.mock('@/features/operations/services/operations.api', () => ({ operationsApi: api }));
vi.mock('./JourneySummary', () => ({ JourneySummary: () => null }));
const user = {
  id: 'B',
  name: 'Khách B',
  email: 'b@example.test',
  phone: '0905550002',
  role: 'PASSENGER' as const,
  active: true,
  emailVerified: true,
  permissions: [],
};
let client: QueryClient;
const draft = { tripId: 'trip', holdId: 'old-hold', seatIds: ['A01'], quantity: 1 };
const hold: Hold = {
  id: 'old-hold',
  tripId: 'trip',
  userId: 'B',
  seatIds: ['A01'],
  quantity: 1,
  price: 100000,
  status: 'active',
  expiresAt: new Date(Date.now() + 600000).toISOString(),
  serverTime: new Date().toISOString(),
};
function open() {
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/booking/trip']}>
        <Routes>
          <Route path="/booking/:tripId" element={<BookingFlow />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  useSession.getState().setUser(user);
  getBookingDraftStore('A').getState().clear();
  getBookingDraftStore('B').getState().clear();
  api.trip.mockResolvedValue({
    id: 'trip',
    routeId: 'route',
    departure: '2099-01-01T00:00:00Z',
    seatMode: true,
    price: 100000,
    capacity: 2,
    available: 1,
  });
  api.catalog.mockResolvedValue({
    routes: [{ id: 'route', stopIds: ['start', 'end'] }],
    stops: [],
  });
  api.seats.mockResolvedValue([
    { id: 'A01', status: 'held', mine: false },
    { id: 'A02', status: 'available', mine: false },
  ]);
  api.activeVouchers.mockResolvedValue([]);
});
afterEach(() => {
  cleanup();
  client?.clear();
});
it('clears only the current users missing hold and lets them select a free seat again', async () => {
  getBookingDraftStore('A')
    .getState()
    .set({ ...draft, holdId: 'A-hold' });
  getBookingDraftStore('B').getState().set(draft);
  api.hold.mockRejectedValue(new ApiError('Không tìm thấy giữ chỗ.', 404));
  open();
  await waitFor(() => expect(getBookingDraftStore('B').getState().holdId).toBe(''));
  expect(getBookingDraftStore('A').getState().holdId).toBe('A-hold');
  expect(api.release).not.toHaveBeenCalled();
  fireEvent.click(await screen.findByRole('button', { name: 'Ghế A02' }));
  expect(screen.getByRole('button', { name: 'ĐẶT CHỖ' })).toBeEnabled();
  expect(screen.queryByText('Không tìm thấy giữ chỗ.')).toBeNull();
});
it.each([undefined, 500])(
  'keeps a saved hold after a transient error (status %s)',
  async status => {
    getBookingDraftStore('B').getState().set(draft);
    api.hold.mockRejectedValue(new ApiError('Kết nối tạm lỗi', status));
    open();
    await screen.findByText('Kết nối tạm lỗi');
    expect(getBookingDraftStore('B').getState().holdId).toBe('old-hold');
    expect(api.release).not.toHaveBeenCalled();
  }
);
it('removes selected seats that become occupied by another passenger during polling', async () => {
  getBookingDraftStore('B')
    .getState()
    .set({ ...draft, holdId: '', seatIds: ['A01'] });
  api.seats.mockResolvedValueOnce([
    { id: 'A01', status: 'available', mine: false },
    { id: 'A02', status: 'available', mine: false },
  ]);
  open();
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Ghế A01' })).toHaveAttribute('aria-pressed', 'true')
  );
  await act(() => client.invalidateQueries({ queryKey: ['seats'] }));
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Ghế A01' })).toHaveAttribute('aria-pressed', 'false')
  );
  expect(screen.getByRole('button', { name: 'Ghế A01' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'ĐẶT CHỖ' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Ghế A02' }));
  expect(screen.getByRole('button', { name: 'ĐẶT CHỖ' })).toBeEnabled();
});
it('restores the owners active hold without clearing their locked seats', async () => {
  getBookingDraftStore('B').getState().set(draft);
  api.hold.mockResolvedValue(hold);
  api.seats.mockResolvedValue([
    { id: 'A01', status: 'held', mine: true },
    { id: 'A02', status: 'available', mine: false },
  ]);
  open();
  await screen.findByText('Chỗ đang được giữ cho bạn');
  expect(getBookingDraftStore('B').getState().holdId).toBe('old-hold');
  expect(screen.getByRole('button', { name: 'Ghế A01' })).toHaveAttribute('aria-pressed', 'true');
});
it('refreshes seats immediately on a hold conflict so the passenger can select another seat', async () => {
  getBookingDraftStore('B')
    .getState()
    .set({ ...draft, holdId: '' });
  api.seats.mockResolvedValueOnce([
    { id: 'A01', status: 'available', mine: false },
    { id: 'A02', status: 'available', mine: false },
  ]);
  api.createHold.mockRejectedValueOnce(new ApiError('Ghế vừa được khách khác giữ.', 409));
  open();
  await screen.findByRole('button', { name: 'Ghế A01' });
  fireEvent.click(screen.getByRole('button', { name: 'ĐẶT CHỖ' }));
  await screen.findByText('Ghế vừa được khách khác giữ.');
  expect(api.seats.mock.calls.length).toBeGreaterThan(1);
  expect(screen.getByRole('button', { name: 'Ghế A01' })).toHaveAttribute('aria-pressed', 'false');
  fireEvent.click(screen.getByRole('button', { name: 'Ghế A02' }));
  expect(screen.getByRole('button', { name: 'ĐẶT CHỖ' })).toBeEnabled();
});
it('keeps a late hold response with A when the logged-in passenger has changed to B', async () => {
  useSession.getState().setUser({ ...user, id: 'A', name: 'Khách A' });
  let finish!: (hold: Hold) => void;
  api.createHold.mockImplementationOnce(
    () =>
      new Promise<Hold>(resolve => {
        finish = resolve;
      })
  );
  open();
  fireEvent.click(await screen.findByRole('button', { name: 'Ghế A02' }));
  fireEvent.click(screen.getByRole('button', { name: 'ĐẶT CHỖ' }));
  await waitFor(() => expect(api.createHold).toHaveBeenCalled());
  act(() => useSession.getState().setUser(user));
  await waitFor(() => expect(screen.getByLabelText('Họ tên')).toHaveValue('Khách B'));
  await act(async () => finish({ ...hold, id: 'A-late-hold', userId: 'A', seatIds: ['A02'] }));
  await waitFor(() => expect(getBookingDraftStore('A').getState().holdId).toBe('A-late-hold'));
  expect(getBookingDraftStore('B').getState().holdId).toBe('');
  expect(screen.queryByText('Chỗ đang được giữ cho bạn')).toBeNull();
});

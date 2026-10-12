import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { useSession } from '@/store/session.store';
import { ScanTicket } from './ScanTicket';

const api = vi.hoisted(() => ({
  assigned: vi.fn(),
  catalog: vi.fn(),
  validate: vi.fn(),
  roster: vi.fn(),
}));
vi.mock('@/features/operations/services/operations.api', () => ({ operationsApi: api }));
vi.mock('../services/checkin.api', () => ({
  validateTicket: api.validate,
  listCheckedInPassengers: api.roster,
}));
const message = 'Chuyến chưa mở soát vé. Giờ mở: 06:00 13/10/2026 (giờ Việt Nam).';
const trip = {
  id: 'trip-1',
  routeId: 'route-1',
  departure: '2026-10-12T23:30:00Z',
  duration: 120,
  checkIn: {
    state: 'not_open',
    message,
    opensAt: '2026-10-12T23:00:00Z',
    closesAt: '2026-10-13T03:00:00Z',
    serverTime: '2026-10-12T02:41:00Z',
  },
};
const open = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/staff/scan?tripId=trip-1']}>
        <ScanTicket />
      </MemoryRouter>
    </QueryClientProvider>
  );
  return client;
};
beforeEach(() => {
  vi.clearAllMocks();
  useSession
    .getState()
    .setUser({
      id: 'driver-1',
      role: 'DRIVER',
      name: 'Tài xế',
      email: '',
      phone: '',
      active: true,
      permissions: ['check-in'],
    });
  api.assigned.mockResolvedValue([trip]);
  api.catalog.mockResolvedValue({
    routes: [{ id: 'route-1', name: 'Bến xe Mỹ Đình → Công Nghệ Thông Tin' }],
  });
  api.roster.mockResolvedValue([]);
});
afterEach(cleanup);
it("shows the server opening time and blocks camera/manual scanning before tomorrow's trip opens", async () => {
  open();
  await screen.findByRole('combobox', { name: 'Chuyến cần soát vé' });
  expect(screen.getByRole('button', { name: 'Bật camera đọc QR' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Xác thực & ghi nhận lên xe' })).toBeDisabled();
  expect(screen.getByText(message)).toBeTruthy();
  fireEvent.submit(screen.getByLabelText('Token từ vé QR').closest('form')!);
  expect(api.validate).not.toHaveBeenCalled();
});
it('allows a paid QR scan only after the server reports the window open', async () => {
  api.assigned.mockResolvedValue([
    { ...trip, checkIn: { ...trip.checkIn, state: 'open', message: 'Đang mở soát vé.' } },
  ]);
  api.validate.mockResolvedValue({ valid: true, message: 'Đã ghi nhận lên xe', quantity: 2 });
  open();
  await screen.findByRole('combobox', { name: 'Chuyến cần soát vé' });
  fireEvent.change(screen.getByLabelText('Token từ vé QR'), {
    target: { value: 'signed-qr-token' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Xác thực & ghi nhận lên xe' }));
  await waitFor(() =>
    expect(api.validate).toHaveBeenCalledWith('driver-1', 'trip-1', 'signed-qr-token')
  );
});
it('unlocks after a fresh server response without reloading the page', async () => {
  const client = open();
  await screen.findByRole('combobox', { name: 'Chuyến cần soát vé' });
  expect(screen.getByRole('button', { name: 'Bật camera đọc QR' })).toBeDisabled();
  api.assigned.mockResolvedValue([
    { ...trip, checkIn: { ...trip.checkIn, state: 'open', message: 'Đang mở soát vé.' } },
  ]);
  await act(async () => {
    await client.invalidateQueries({ queryKey: ['assigned', 'driver-1'] });
  });
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Bật camera đọc QR' })).toBeEnabled()
  );
});
it('does not trust a trip id in the URL when the driver is not assigned to it', async () => {
  api.assigned.mockResolvedValue([
    { ...trip, id: 'another-trip', checkIn: { ...trip.checkIn, state: 'open' } },
  ]);
  open();
  await screen.findByRole('combobox', { name: 'Chuyến cần soát vé' });
  expect(screen.getByRole('button', { name: 'Bật camera đọc QR' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Xác thực & ghi nhận lên xe' })).toBeDisabled();
  fireEvent.submit(screen.getByLabelText('Token từ vé QR').closest('form')!);
  expect(api.validate).not.toHaveBeenCalled();
});
it('blocks scanning after the server closes the window', async () => {
  api.assigned.mockResolvedValue([
    {
      ...trip,
      checkIn: {
        ...trip.checkIn,
        state: 'closed',
        message: 'Chuyến đã đóng soát vé lúc 10:00 13/10/2026 (giờ Việt Nam).',
      },
    },
  ]);
  open();
  await screen.findByText('Chuyến đã đóng soát vé lúc 10:00 13/10/2026 (giờ Việt Nam).');
  expect(screen.getByRole('button', { name: 'Xác thực & ghi nhận lên xe' })).toBeDisabled();
});

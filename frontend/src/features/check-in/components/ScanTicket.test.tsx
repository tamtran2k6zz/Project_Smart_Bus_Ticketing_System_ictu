import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
let client: QueryClient;
beforeEach(() => {
  vi.clearAllMocks();
  useSession.getState().setUser({
    id: 'driver',
    name: 'Tài xế thử',
    email: 'driver@example.test',
    phone: '',
    role: 'DRIVER',
    active: true,
    emailVerified: true,
    permissions: ['check-in'],
  });
  api.assigned.mockResolvedValue([
    { id: 'trip', routeId: 'route', departure: '2099-01-01T01:00:00Z' },
  ]);
  api.catalog.mockResolvedValue({ routes: [{ id: 'route', name: 'Tuyến thử' }] });
  api.roster.mockResolvedValue([]);
});
afterEach(() => {
  cleanup();
  client?.clear();
  vi.restoreAllMocks();
});
async function open() {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/?tripId=trip']}>
        <ScanTicket />
      </MemoryRouter>
    </QueryClientProvider>
  );
  await screen.findByLabelText('Token từ vé QR');
  fireEvent.change(screen.getByLabelText('Token từ vé QR'), {
    target: { value: 'signed-test-token' },
  });
}
it('blocks offline scanning before calling the API and never reports a ticket as valid', async () => {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
  await open();
  fireEvent.click(screen.getByRole('button', { name: 'Xác thực & ghi nhận lên xe' }));
  await screen.findByText('Đang ngoại tuyến. Chưa thể xác minh vé.');
  expect(api.validate).not.toHaveBeenCalled();
  expect(screen.queryByText('Vé hợp lệ')).toBeNull();
});
it('recovers from a network failure without crashing or assuming check-in succeeded', async () => {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  api.validate.mockRejectedValueOnce(
    new Error('Mất kết nối. Kiểm tra trạng thái trước khi thử lại.')
  );
  api.validate.mockResolvedValueOnce({ valid: true, message: 'Vé đã được xác nhận', quantity: 1 });
  await open();
  fireEvent.click(screen.getByRole('button', { name: 'Xác thực & ghi nhận lên xe' }));
  await screen.findByText('Mất kết nối. Kiểm tra trạng thái trước khi thử lại.');
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Xác thực & ghi nhận lên xe' })).toBeEnabled()
  );
  fireEvent.click(screen.getByRole('button', { name: 'Xác thực & ghi nhận lên xe' }));
  await screen.findByText(/Vé đã được xác nhận/);
  expect(api.validate).toHaveBeenCalledTimes(2);
  expect(screen.queryByText('Mất kết nối. Kiểm tra trạng thái trước khi thử lại.')).toBeNull();
});

import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { useSession } from '@/store/session.store';
import { ResourceManager } from './ResourceManager';
const api = vi.hoisted(() => ({
  catalog: vi.fn(),
  list: vi.fn(),
  cleanupOldTrips: vi.fn(),
  save: vi.fn(),
  remove: vi.fn(),
}));
vi.mock('../services/operations.api', () => ({ operationsApi: api }));
vi.mock('./SchedulePlanner', () => ({ SchedulePlanner: () => null }));
vi.mock('@/features/passes/components/FarePolicies', () => ({ FarePolicies: () => null }));
let client: QueryClient;
beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    },
  });
  useSession
    .getState()
    .setUser({
      id: 'admin',
      name: 'Admin',
      role: 'ADMIN',
      email: 'admin@example.test',
      phone: '',
      active: true,
      permissions: [],
    });
});
afterEach(() => {
  cleanup();
  client?.clear();
});
it('releases a completed trip from operations and exposes its history without edit or delete actions', async () => {
  const trip = {
    id: 'completed',
    routeId: 'r1',
    vehicleId: 'v1',
    departure: '2026-09-27T23:30:00Z',
    duration: 60,
    status: 'completed',
    seatMode: true,
    price: 10000,
    capacity: 40,
    available: 39,
    archivedAt: undefined as string | undefined,
  };
  api.catalog.mockResolvedValue({
    routes: [{ id: 'r1', name: 'Bến xe Mỹ Đình - Bến xe Long Biên' }],
    vehicles: [{ id: 'v1', plate: '29B-188.22', name: 'Xe buýt' }],
    stops: [],
    trips: [trip],
  });
  api.list.mockImplementation(async (key: string, _user: string, archived = false) =>
    key === 'trips' && Boolean(trip.archivedAt) === archived ? [{ ...trip }] : []
  );
  api.cleanupOldTrips.mockImplementation(async () => {
    trip.archivedAt = '2026-10-15T00:00:00Z';
    return { oldTripsCleaned: 1, message: 'Đã giải phóng và lưu trữ 1 chuyến hoàn thành.' };
  });
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ResourceManager resource="trips" />
      </MemoryRouter>
    </QueryClientProvider>
  );
  await screen.findByText('29B-188.22');
  fireEvent.click(screen.getByRole('button', { name: 'Giải phóng chuyến hoàn thành' }));
  await screen.findByText('Đã giải phóng và lưu trữ 1 chuyến hoàn thành.');
  await waitFor(() => expect(screen.queryByText('29B-188.22')).toBeNull());
  fireEvent.click(screen.getByRole('button', { name: 'Đã lưu trữ' }));
  await screen.findByText('29B-188.22');
  expect(api.list).toHaveBeenCalledWith('trips', 'admin', true);
  expect(screen.queryByRole('button', { name: 'Thêm mới' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Sửa completed' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Xóa completed' })).toBeNull();
});

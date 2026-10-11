import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSession } from '@/store/session.store';
import { Checkout, PaymentResult } from './Checkout';

const api = vi.hoisted(() => ({
  booking: vi.fn(),
  hold: vi.fn(),
  latest: vi.fn(),
  start: vi.fn(),
  confirmDemo: vi.fn(),
}));
vi.mock('@/features/booking/services/booking.api', () => ({ bookingApi: api }));
vi.mock('../services/payment.api', () => ({ paymentApi: api }));
vi.mock('@/features/booking/components/JourneySummary', () => ({ JourneySummary: () => null }));
vi.mock('@/configs/app.config', () => ({ appConfig: { demo: false } }));
const user = {
  id: 'u1',
  name: 'Khách thử',
  email: 'customer@example.test',
  phone: '',
  role: 'PASSENGER' as const,
  active: true,
  permissions: [],
  emailVerified: true,
};
let client: QueryClient;
function open(result?: string) {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[result || '/checkout/b1']}>
        <Routes>
          <Route path="/checkout/:bookingId" element={<Checkout />} />
          <Route path="/payment/result" element={<PaymentResult />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  useSession.getState().setUser(user);
  api.booking.mockResolvedValue({
    id: 'b1',
    holdId: 'h1',
    tripId: 'trip1',
    status: 'pending',
    total: 20000,
    name: user.name,
    phone: '0901234567',
    quantity: 1,
    seatIds: ['A01'],
  });
  api.hold.mockResolvedValue({
    id: 'h1',
    status: 'active',
    serverTime: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 8 * 60000).toISOString(),
  });
  api.latest.mockResolvedValue({ id: 'p1', gateway: 'MoMo', status: 'pending', amount: 20000 });
  api.start.mockRejectedValue(new Error('Cổng thanh toán đang bận.'));
});

it('explains an unverified return without treating its URL as payment confirmation', async () => {
  open('/payment/result?paymentOrder=b1&paymentResult=failed');
  await screen.findByText(/Chưa xác minh được kết quả từ cổng thanh toán/);
  expect(screen.queryByRole('link', { name: 'Trở lại thanh toán' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra lại trạng thái' }));
  await waitFor(() => expect(api.booking).toHaveBeenCalledTimes(2));
  expect(api.start).not.toHaveBeenCalled();
});

it('shows the confirmed ticket when the API is paid even if the return URL says failed', async () => {
  const booking = await api.booking();
  api.booking.mockResolvedValue({ ...booking, status: 'paid', ticketEmailStatus: 'sent' });
  open('/payment/result?paymentOrder=b1&paymentResult=failed');
  await screen.findByText('Vé QR của bạn đã sẵn sàng trong Vé của tôi.');
  expect(screen.queryByText(/Chưa xác minh được kết quả từ cổng thanh toán/)).toBeNull();
});
afterEach(() => {
  cleanup();
  client?.clear();
});

it('lets a customer switch gateway while an existing payment is pending', async () => {
  open();
  await screen.findByText('Chỗ đang được giữ cho bạn');
  const radio = screen.getByRole('radio', { name: 'VNPay' }) as HTMLInputElement;
  expect(radio.disabled).toBe(false);
  fireEvent.click(radio);
  fireEvent.click(screen.getByRole('button', { name: /thanh toán.*20/ }));
  await waitFor(() => expect(api.start).toHaveBeenCalledWith('b1', 'u1', 'VNPay'));
});

it('allows retry when a gateway failed after the pending payment was saved', async () => {
  open();
  await screen.findByText('Chỗ đang được giữ cho bạn');
  const button = screen.getByRole('button', { name: /thanh toán.*20/ }) as HTMLButtonElement;
  expect(button.disabled).toBe(false);
  fireEvent.click(button);
  await screen.findByText('Cổng thanh toán đang bận.');
  expect(button.disabled).toBe(false);
});

it('restores the existing gateway when the customer returns to checkout', async () => {
  api.latest.mockResolvedValue({ id: 'p1', gateway: 'VNPay', status: 'pending', amount: 20000 });
  open();
  await screen.findByText('Chỗ đang được giữ cho bạn');
  await waitFor(() =>
    expect((screen.getByRole('radio', { name: 'VNPay' }) as HTMLInputElement).checked).toBe(true)
  );
});

it('keeps payment disabled when the hold has expired', async () => {
  api.hold.mockResolvedValue({
    id: 'h1',
    status: 'expired',
    serverTime: new Date().toISOString(),
    expiresAt: new Date(Date.now() - 1000).toISOString(),
  });
  open();
  await screen.findByText('Giữ chỗ hết hạn. Không thể thanh toán, hãy đặt lại.');
  expect((screen.getByRole('radio', { name: 'VNPay' }) as HTMLInputElement).disabled).toBe(true);
  expect(
    (screen.getByRole('button', { name: /thanh toán.*20/ }) as HTMLButtonElement).disabled
  ).toBe(true);
  expect(api.start).not.toHaveBeenCalled();
});

it('blocks duplicate submissions and changes while the request is in flight', async () => {
  let rejectStart!: (reason: Error) => void;
  api.start.mockImplementation(
    () =>
      new Promise((_, reject) => {
        rejectStart = reject;
      })
  );
  open();
  await screen.findByText('Chỗ đang được giữ cho bạn');
  const button = screen.getByRole('button', { name: /thanh toán.*20/ }) as HTMLButtonElement;
  fireEvent.click(button);
  await waitFor(() => expect(button.disabled).toBe(true));
  fireEvent.click(button);
  expect(api.start).toHaveBeenCalledTimes(1);
  expect((screen.getByRole('radio', { name: 'VNPay' }) as HTMLInputElement).disabled).toBe(true);
  rejectStart(new Error('Thử lại'));
  await screen.findByText('Thử lại');
  await waitFor(() => expect(button.disabled).toBe(false));
});

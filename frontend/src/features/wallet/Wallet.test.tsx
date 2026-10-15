import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { useSession } from '@/store/session.store';
import Wallet from './Wallet';
import { WithdrawalReview } from './WithdrawalReview';
const api = vi.hoisted(() => ({
  overview: vi.fn(),
  withdraw: vi.fn(),
  subscription: vi.fn(),
  reviewList: vi.fn(),
  review: vi.fn(),
  topup: vi.fn(),
}));
vi.mock('./wallet.api', () => ({ walletApi: api, openPayment: vi.fn() }));
vi.mock('@/configs/app.config', () => ({ appConfig: { demo: false } }));
vi.mock('@/features/passes/services/passes.api', () => ({
  passesApi: { list: async () => ({ passes: [{ id: 'p1', routeId: 'r1', status: 'active' }] }) },
}));
vi.mock('@/features/operations/services/operations.api', () => ({
  operationsApi: { catalog: async () => ({ routes: [{ id: 'r1', name: 'Tuyến ICTU' }] }) },
}));
let client: QueryClient;
const user = {
  id: 'u1',
  name: 'Khách Ví',
  email: 'wallet@example.test',
  phone: '',
  role: 'PASSENGER' as const,
  active: true,
  permissions: [],
  emailVerified: true,
};
function open(component = <Wallet />) {
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{component}</MemoryRouter>
    </QueryClientProvider>
  );
}
beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    },
  });
  vi.clearAllMocks();
  useSession.getState().setUser(user);
  api.overview.mockResolvedValue({
    wallet: { balance: 300000, status: 'ACTIVE' },
    transactions: [],
    withdrawals: [],
    subscriptions: [],
    topups: [],
  });
  api.withdraw.mockResolvedValue({ id: 'w1' });
  api.subscription.mockResolvedValue({});
  api.reviewList.mockResolvedValue([
    {
      id: 'w1',
      user_id: 'u2',
      customer_name: 'Khách B',
      amount: 100000,
      bank_name: 'VCB',
      bank_account_number: '0123456789',
      account_holder_name: 'KHACH B',
      status: 'PENDING',
      created_at: '2026-10-14T00:00:00Z',
    },
  ]);
  api.review.mockResolvedValue({});
});
afterEach(() => {
  cleanup();
  client?.clear();
});
it('collects bank payout details and reuses the request key when retrying a network error', async () => {
  api.withdraw.mockRejectedValueOnce(new Error('Mất kết nối thử lại'));
  open();
  await screen.findByText('SỐ DƯ KHẢ DỤNG');
  fireEvent.click(screen.getByRole('button', { name: 'Rút về ngân hàng' }));
  fireEvent.change(screen.getByLabelText('Tên ngân hàng'), { target: { value: 'Vietcombank' } });
  fireEvent.change(screen.getByLabelText('Số tài khoản ngân hàng'), {
    target: { value: '0123456789' },
  });
  fireEvent.change(screen.getByLabelText('Tên chủ tài khoản'), { target: { value: 'KHACH VI' } });
  fireEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu rút tiền' }));
  await screen.findAllByText('Mất kết nối thử lại');
  fireEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu rút tiền' }));
  await waitFor(() => expect(api.withdraw).toHaveBeenCalledTimes(2));
  const first = api.withdraw.mock.calls[0][0];
  expect(first).toMatchObject({
    amount: 100000,
    bankName: 'Vietcombank',
    bankAccountNumber: '0123456789',
    accountHolderName: 'KHACH VI',
  });
  expect(api.withdraw.mock.calls[1][0].requestKey).toBe(first.requestKey);
});
it('requires consent and sends the approved limit for automatic renewal', async () => {
  open();
  await screen.findByText('Tuyến ICTU');
  const button = screen.getByRole('button', { name: 'Bật / cập nhật gia hạn' });
  expect(button).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Vé tháng cần gia hạn'), { target: { value: 'r1' } });
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(button);
  await waitFor(() => expect(api.subscription).toHaveBeenCalledWith('r1', true, 250000));
});
it('creates a fresh top-up intent after a confirmed failed payment', async () => {
  api.topup
    .mockResolvedValueOnce({ status: 'FAILED' })
    .mockResolvedValueOnce({ status: 'SUCCESS' });
  open();
  await screen.findByText('SỐ DƯ KHẢ DỤNG');
  fireEvent.click(screen.getByRole('button', { name: 'Nạp tiền' }));
  fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục thanh toán' }));
  await screen.findAllByText(
    'Giao dịch trước chưa thành công. Bấm tiếp tục để tạo giao dịch nạp mới.'
  );
  fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục thanh toán' }));
  await waitFor(() => expect(api.topup).toHaveBeenCalledTimes(2));
  expect(api.topup.mock.calls[1][0].requestKey).not.toBe(api.topup.mock.calls[0][0].requestKey);
});
it('keeps failed top-ups distinct from credited wallet transactions', async () => {
  api.overview.mockResolvedValue({
    wallet: { balance: 0, status: 'ACTIVE' },
    transactions: [],
    withdrawals: [],
    subscriptions: [],
    topups: [
      {
        id: 't1',
        amount: 100000,
        method: 'MOMO',
        status: 'FAILED',
        created_at: '2026-10-14T00:00:00Z',
      },
    ],
  });
  open();
  await screen.findByText('Chưa thanh toán thành công');
  expect(screen.queryByText('Đã cộng vào ví')).toBeNull();
  expect(screen.getByRole('button', { name: 'Rút về ngân hàng' })).toBeDisabled();
});
it('does not load bank account details for a manager without finance access', () => {
  useSession.getState().setUser({ ...user, role: 'MANAGER' });
  open(<WithdrawalReview />);
  expect(api.reviewList).not.toHaveBeenCalled();
});
it('requires explicit payout confirmation and a bank transaction reference', async () => {
  useSession.getState().setUser({ ...user, role: 'FINANCE' });
  open(<WithdrawalReview />);
  await screen.findByText('Khách B');
  fireEvent.click(screen.getByRole('button', { name: 'Xử lý' }));
  const confirm = screen.getByRole('button', { name: 'Xác nhận kết quả' });
  expect(confirm).toBeDisabled();
  expect(screen.getByLabelText('Mã giao dịch ngân hàng')).toBeRequired();
  fireEvent.change(screen.getByLabelText('Mã giao dịch ngân hàng'), {
    target: { value: 'VCB-123456' },
  });
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(confirm);
  await waitFor(() => expect(api.review).toHaveBeenCalledWith('w1', 'PAID', 'VCB-123456', ''));
});

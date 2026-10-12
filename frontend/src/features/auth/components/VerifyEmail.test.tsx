import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Link, MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSession } from '@/store/session.store';
import VerifyEmail from './VerifyEmail';

const api = vi.hoisted(() => ({
  verifyEmail: vi.fn(),
  resendVerification: vi.fn(),
  session: vi.fn(),
}));
vi.mock('../services/auth.api', () => ({ authApi: api }));
vi.mock('@/configs/app.config', () => ({ appConfig: { demo: false } }));
const user = {
  id: 'u1',
  name: 'Khách thử',
  email: 'customer@example.test',
  phone: '',
  role: 'PASSENGER' as const,
  active: true,
  permissions: [],
  emailVerified: false,
};
const open = (url = '/verify-email', state?: { notice: string; emailSent: boolean }) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter
        initialEntries={[
          {
            pathname: url.split('#')[0],
            hash: url.includes('#') ? '#' + url.split('#')[1] : '',
            state,
          },
        ]}
      >
        <VerifyEmail />
        <Link to={'/verify-email#token=' + 'c'.repeat(64)}>Mở liên kết email thử</Link>
      </MemoryRouter>
    </QueryClientProvider>
  );
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  useSession.getState().setUser(user);
});

it('does not consume the emailed link until the user confirms', async () => {
  api.verifyEmail.mockResolvedValue({ email: user.email, message: 'Email đã được xác minh.' });
  api.session.mockResolvedValue({ ...user, emailVerified: true });
  open('/verify-email#token=' + 'a'.repeat(64));
  expect(api.verifyEmail).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Xác minh email' }));
  await screen.findByText(/Email đã được xác minh/);
  expect(api.verifyEmail).toHaveBeenCalledWith('a'.repeat(64));
  await waitFor(() => expect(useSession.getState().user?.emailVerified).toBe(true));
  expect(screen.queryByRole('button', { name: 'Xác minh email' })).toBeNull();
  expect(screen.getByRole('link', { name: 'Tìm chuyến và đặt vé' })).toBeTruthy();
});
it('shows an expired link error without marking the email verified', async () => {
  api.verifyEmail.mockRejectedValue(new Error('Liên kết đã hết hạn.'));
  open('/verify-email#token=' + 'b'.repeat(64));
  fireEvent.click(screen.getByRole('button', { name: 'Xác minh email' }));
  await screen.findByText('Liên kết đã hết hạn.');
  expect(useSession.getState().user?.emailVerified).toBe(false);
});
it('reports SMTP failure honestly and keeps the resend action available', async () => {
  api.resendVerification.mockResolvedValue({
    emailSent: false,
    emailVerified: false,
    message: 'Chưa gửi được email. Vui lòng liên hệ nhà xe.',
  });
  open();
  fireEvent.click(screen.getByRole('button', { name: 'Gửi lại email xác minh' }));
  await screen.findByText('Chưa gửi được email. Vui lòng liên hệ nhà xe.');
  expect(screen.getByRole('alert').textContent).toContain('Chưa gửi được email.');
  expect(useSession.getState().user?.emailVerified).toBe(false);
});
it('does not imply an email was sent when opening the page without a delivery result', () => {
  open();
  expect(screen.getByRole('status').textContent).toContain('Chưa có xác nhận gửi email');
  expect(
    screen.queryByText('Mở email SmartBus và bấm liên kết xác minh. Kiểm tra cả thư rác.')
  ).toBeNull();
});
it('shows the failed registration delivery notice as an error', () => {
  open('/verify-email', {
    emailSent: false,
    notice: 'Tài khoản đã tạo; chưa gửi được email xác minh.',
  });
  expect(screen.getByRole('alert').textContent).toContain('chưa gửi được email');
  expect(screen.queryByRole('status')).toBeNull();
});
it('shows a delivery confirmation only after the API accepts the email', async () => {
  api.resendVerification.mockResolvedValue({
    emailSent: true,
    emailVerified: false,
    message: 'Đã gửi liên kết xác minh. Kiểm tra cả thư rác.',
  });
  open();
  fireEvent.click(screen.getByRole('button', { name: 'Gửi lại email xác minh' }));
  await screen.findByText('Đã gửi liên kết xác minh. Kiểm tra cả thư rác.');
  expect(screen.queryByRole('alert')).toBeNull();
  expect(useSession.getState().user?.emailVerified).toBe(false);
});
it('accepts an emailed link opened while the verification page is already mounted', async () => {
  api.verifyEmail.mockResolvedValue({ email: user.email, message: 'Email đã được xác minh.' });
  api.session.mockResolvedValue({ ...user, emailVerified: true });
  open();
  fireEvent.click(screen.getByRole('link', { name: 'Mở liên kết email thử' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Xác minh email' }));
  await waitFor(() => expect(api.verifyEmail).toHaveBeenCalledWith('c'.repeat(64)));
});

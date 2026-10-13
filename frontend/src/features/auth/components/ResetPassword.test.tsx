import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ResetPassword from './ResetPassword';
const mocks = vi.hoisted(() => ({ reset: vi.fn(), clear: vi.fn(), setUser: vi.fn() }));
vi.mock('../services/auth.api', () => ({ authApi: { resetPassword: mocks.reset } }));
vi.mock('@/services/http', () => ({ clearAccessToken: mocks.clear }));
vi.mock('@/store/session.store', () => ({
  useSession: { getState: () => ({ setUser: mocks.setUser }) },
}));
function Address() {
  const l = useLocation();
  return <output data-testid="address">{l.pathname + l.hash}</output>;
}
function open(address = '/reset-password#token=' + 'a'.repeat(64)) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[address]}>
        <ResetPassword />
        <Address />
      </MemoryRouter>
    </QueryClientProvider>
  );
}
beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);
it('requires a recovery link without allowing a password change', () => {
  open('/reset-password');
  expect(screen.getByRole('alert')).toHaveTextContent('thiếu mã');
  expect(screen.queryByRole('button', { name: 'Lưu mật khẩu mới' })).toBeNull();
});
it('removes the token from the address and rejects mismatching passwords', async () => {
  open();
  expect(await screen.findByTestId('address')).toHaveTextContent(/^\/reset-password$/);
  fireEvent.change(screen.getByLabelText('Mật khẩu mới', { exact: true }), {
    target: { value: 'Changed@123' },
  });
  fireEvent.change(screen.getByLabelText('Nhập lại mật khẩu mới'), {
    target: { value: 'Different@123' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Lưu mật khẩu mới' }));
  await screen.findByText('Hai mật khẩu không khớp.');
  expect(mocks.reset).not.toHaveBeenCalled();
});
it('uses the captured token once and clears the old session after success', async () => {
  mocks.reset.mockResolvedValue({ message: 'Đã đổi mật khẩu.' });
  open();
  for (const label of ['Mật khẩu mới', 'Nhập lại mật khẩu mới'])
    fireEvent.change(screen.getByLabelText(label, { exact: true }), {
      target: { value: 'Changed@123' },
    });
  fireEvent.click(screen.getByRole('button', { name: 'Lưu mật khẩu mới' }));
  await screen.findByText('Đã đổi mật khẩu.');
  expect(mocks.reset).toHaveBeenCalledWith('a'.repeat(64), 'Changed@123');
  expect(mocks.clear).toHaveBeenCalled();
  expect(mocks.setUser).toHaveBeenCalledWith(null);
  expect(screen.queryByLabelText('Mật khẩu mới', { exact: true })).toBeNull();
});

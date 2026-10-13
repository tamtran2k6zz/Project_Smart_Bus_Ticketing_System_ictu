import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { appConfig } from '@/configs/app.config';
import { AuthForm } from './AuthForm';

const api = vi.hoisted(() => ({ login: vi.fn(), register: vi.fn(), forgot: vi.fn() }));
vi.mock('../services/auth.api', () => ({ authApi: api }));
vi.mock('@/configs/app.config', () => ({ appConfig: { demo: false, quickLogin: true } }));

const open = (mode: 'login' | 'register' | 'forgot' = 'login') =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <AuthForm mode={mode} />
      </MemoryRouter>
    </QueryClientProvider>
  );
beforeEach(() => {
  vi.clearAllMocks();
  appConfig.quickLogin = true;
  appConfig.localDemo = false;
  api.login.mockResolvedValue(undefined);
});
afterEach(cleanup);

it('allows phone sign-in through the form', async () => {
  open();
  fireEvent.change(screen.getByLabelText('Email hoặc số điện thoại'), {
    target: { value: '0987654321' },
  });
  fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'Driver@123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
  await waitFor(() => expect(api.login).toHaveBeenCalledWith('0987654321', 'Driver@123'));
});

it('logs in the real driver with one click and fills the selected account', async () => {
  open();
  fireEvent.click(screen.getByRole('button', { name: /Tài xế.*0987654321/ }));
  await waitFor(() => expect(api.login).toHaveBeenCalledWith('0987654321', 'Driver@123'));
  expect(screen.getByLabelText('Email hoặc số điện thoại')).toHaveValue('0987654321');
});
it('uses the isolated demo account when the local API demo is selected', async () => {
  appConfig.localDemo = true;
  open();
  fireEvent.click(screen.getByRole('button', { name: /Tài xế.*0901234561/ }));
  await waitFor(() => expect(api.login).toHaveBeenCalledWith('0901234561', 'SmartBus123!'));
});

it('keeps the buttons disabled until a failed login completes, then shows its error', async () => {
  let reject!: (error: Error) => void;
  api.login.mockReturnValue(
    new Promise((_resolve, fail) => {
      reject = fail;
    })
  );
  open();
  fireEvent.click(screen.getByRole('button', { name: /Tài xế.*0987654321/ }));
  expect(screen.getByRole('button', { name: /Quản trị.*0981112233/ })).toBeDisabled();
  reject(new Error('Mật khẩu đã được thay đổi'));
  await screen.findByText('Mật khẩu đã được thay đổi');
  expect(screen.getByRole('button', { name: /Tài xế.*0987654321/ })).toBeEnabled();
});

it('hides account shortcuts when the deployment has not enabled them', () => {
  appConfig.quickLogin = false;
  open();
  expect(screen.queryByText('Đăng nhập nhanh để test')).toBeNull();
});
it('enables real password recovery and submits the email', async () => {
  api.forgot.mockResolvedValue({ message: 'Hãy kiểm tra hộp thư.' });
  open('forgot');
  const button = screen.getByRole('button', { name: 'Gửi yêu cầu' });
  expect(button).toBeEnabled();
  fireEvent.change(screen.getByLabelText('Email', { exact: true }), {
    target: { value: 'reset@example.test' },
  });
  fireEvent.click(button);
  await screen.findByText('Hãy kiểm tra hộp thư.');
  expect(api.forgot).toHaveBeenCalledWith('reset@example.test');
});

it.each(['register', 'forgot'] as const)('still requires email for %s', async mode => {
  open(mode);
  fireEvent.change(screen.getByLabelText('Email', { exact: true }), {
    target: { value: '0987654321' },
  });
  fireEvent.submit(screen.getByLabelText('Email', { exact: true }).closest('form')!);
  await screen.findByText('Email không hợp lệ');
  expect(api.register).not.toHaveBeenCalled();
  expect(api.forgot).not.toHaveBeenCalled();
  expect(screen.queryByText('Đăng nhập nhanh để test')).toBeNull();
});

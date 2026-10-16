import { beforeEach, expect, it, vi } from 'vitest';
const mocked = vi.hoisted(() => ({
  request: vi.fn(),
  intercept: undefined as unknown as (config: { headers: Record<string, string> }) => {
    headers: Record<string, string>;
  },
  onError: undefined as unknown as (error: unknown) => Promise<never>,
}));
vi.mock('axios', () => ({
  default: {
    create: () => ({
      request: mocked.request,
      interceptors: {
        request: {
          use: (fn: typeof mocked.intercept) => {
            mocked.intercept = fn;
          },
        },
        response: {
          use: (_success: unknown, reject: typeof mocked.onError) => {
            mocked.onError = reject;
          },
        },
      },
    }),
  },
}));
import { request } from './http';
it('preserves HTTP status so missing holds can be distinguished from network outages', async () => {
  const reject = mocked.onError;
  await expect(
    reject({ response: { status: 404, data: { message: 'Không tìm thấy giữ chỗ.' } } })
  ).rejects.toMatchObject({ message: 'Không tìm thấy giữ chỗ.', status: 404 });
  await expect(reject({ code: 'ECONNABORTED' })).rejects.toMatchObject({
    message: 'Kết nối hết thời gian chờ. Vui lòng thử lại.',
    status: undefined,
  });
});
beforeEach(() => {
  sessionStorage.clear();
  mocked.request.mockReset();
});
it('maps the Express login envelope and attaches its bearer token', async () => {
  mocked.request.mockResolvedValue({
    data: {
      success: true,
      data: {
        user: {
          id: 'u1',
          fullName: 'Khách hàng',
          email: 'a@example.test',
          phoneNumber: '0901234567',
          role: 'PASSENGER',
          status: 'ACTIVE',
          emailVerified: false,
        },
        tokens: { accessToken: 'signed-token' },
      },
    },
  });
  expect(
    await request('/auth/login', 'POST', { email: 'a@example.test', password: 'secret' })
  ).toMatchObject({
    id: 'u1',
    name: 'Khách hàng',
    active: true,
    emailVerified: false,
    permissions: [],
  });
  const intercept = mocked.intercept;
  expect(intercept({ headers: {} }).headers.Authorization).toBe('Bearer signed-token');
});
it('normalizes auth/me session data and clears credentials on logout', async () => {
  mocked.request.mockResolvedValueOnce({
    data: {
      success: true,
      data: { id: 'manager', fullName: 'Điều hành', role: 'MANAGER', status: 'ACTIVE' },
    },
  });
  expect(await request('/auth/session')).toMatchObject({
    name: 'Điều hành',
    permissions: expect.arrayContaining(['reports']),
  });
  sessionStorage.setItem('smartbus.accessToken.v1', 'old-token');
  mocked.request.mockResolvedValueOnce({ data: true });
  await request('/auth/logout', 'POST');
  expect(sessionStorage.getItem('smartbus.accessToken.v1')).toBeNull();
});
it('preserves a failed verification delivery result from registration', async () => {
  mocked.request.mockResolvedValue({
    data: {
      success: true,
      data: {
        user: {
          id: 'u1',
          fullName: 'Khách hàng',
          role: 'PASSENGER',
          status: 'ACTIVE',
          emailVerified: false,
        },
        emailSent: false,
        emailConfirmationNotice: 'Chưa gửi được email xác minh.',
      },
    },
  });
  expect(await request('/auth/register', 'POST', {})).toMatchObject({
    emailVerificationSent: false,
    emailVerificationNotice: 'Chưa gửi được email xác minh.',
  });
});

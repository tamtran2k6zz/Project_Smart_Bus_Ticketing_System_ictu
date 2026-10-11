import { beforeEach, expect, it, vi } from 'vitest';
const mocked = vi.hoisted(() => ({
  request: vi.fn(),
  intercept: undefined as unknown as (config: { headers: Record<string, string> }) => {
    headers: Record<string, string>;
  },
  onResponse: vi.fn(),
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
        response: { use: mocked.onResponse },
      },
    }),
  },
}));
import { request } from './http';
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

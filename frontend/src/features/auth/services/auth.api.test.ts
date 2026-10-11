import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { appConfig } from '@/configs/app.config';
import { seed } from '@/services/mocks/database';
import { authApi } from './auth.api';

const http = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('@/services/http', () => http);
const originalDemo = appConfig.demo;

beforeEach(() => {
  appConfig.demo = true;
  localStorage.clear();
  http.request.mockReset();
});
afterEach(() => {
  appConfig.demo = originalDemo;
});

it.each(['0901234560', '+84901234560', ' PASSENGER@SMARTBUS.DEMO '])(
  'authenticates the same demo passenger with %s',
  async identifier => {
    expect(await authApi.login(identifier, 'SmartBus123!')).toMatchObject({
      id: 'u0',
      role: 'PASSENGER',
    });
  }
);

it('rejects a wrong password and an inactive phone account', async () => {
  await expect(authApi.login('0901234560', 'wrong')).rejects.toThrow('mật khẩu');
  const db = seed();
  db.users[0].active = false;
  localStorage.setItem(appConfig.demoStorageKey, JSON.stringify(db));
  await expect(authApi.login('0901234560', 'SmartBus123!')).rejects.toThrow('mật khẩu');
});

it('sends a phone identifier to the real API without falling back to demo', async () => {
  appConfig.demo = false;
  http.request.mockRejectedValue(new Error('API unavailable'));
  await expect(authApi.login(' 0987654321 ', 'Driver@123')).rejects.toThrow('API unavailable');
  expect(http.request).toHaveBeenCalledWith('/auth/login', 'POST', {
    identifier: '0987654321',
    password: 'Driver@123',
  });
  expect(localStorage.getItem(appConfig.demoStorageKey)).toBeNull();
});

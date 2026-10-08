import { query } from '../config/database';
import {
  DeviceError,
  deactivateDeviceTokens,
  getActiveDeviceTokens,
  listDevices,
  registerDevice,
  unregisterDevice,
} from './device.service';

jest.mock('../config/database', () => ({ query: jest.fn() }));

const mockedQuery = query as unknown as jest.Mock;

const deviceRow = {
  id: 'device-1',
  user_id: 'user-1',
  device_token: 'fcm-token-abcdef123',
  platform: 'ANDROID',
  device_name: 'Pixel 8',
  is_active: true,
  created_at: '2026-10-06T00:00:00.000Z',
  updated_at: '2026-10-06T00:00:00.000Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedQuery.mockResolvedValue([deviceRow]);
});

describe('registerDevice', () => {
  it('rejects a too-short device token with 400', async () => {
    await expect(
      registerDevice('user-1', { deviceToken: 'short', platform: 'ANDROID' })
    ).rejects.toBeInstanceOf(DeviceError);
    expect(mockedQuery).not.toHaveBeenCalled();
  });

  it('rejects an unsupported platform with 400', async () => {
    await expect(
      registerDevice('user-1', { deviceToken: 'fcm-token-abcdef123', platform: 'BLACKBERRY' })
    ).rejects.toMatchObject({ status: 400 });
  });

  it('upserts by device_token so re-registration transfers ownership', async () => {
    const device = await registerDevice('user-1', {
      deviceToken: 'fcm-token-abcdef123',
      platform: 'android',
      deviceName: 'Pixel 8',
    });

    const [sql, params] = mockedQuery.mock.calls[0];
    expect(sql).toContain('ON CONFLICT (device_token) DO UPDATE SET');
    expect(sql).toContain('is_active = TRUE');
    expect(params).toEqual(['user-1', 'fcm-token-abcdef123', 'ANDROID', 'Pixel 8']);
    expect(device).toMatchObject({ userId: 'user-1', platform: 'ANDROID', isActive: true });
  });
});

describe('unregisterDevice', () => {
  it('rejects an empty token with 400', async () => {
    await expect(unregisterDevice('user-1', '  ')).rejects.toMatchObject({ status: 400 });
  });

  it('deactivates only the current user token and counts affected rows', async () => {
    mockedQuery.mockResolvedValue([{ id: 'device-1' }]);
    const affected = await unregisterDevice('user-1', 'fcm-token-abcdef123');

    expect(affected).toBe(1);
    const [sql, params] = mockedQuery.mock.calls[0];
    expect(sql).toContain('is_active = FALSE');
    expect(sql).toContain('RETURNING id');
    expect(params).toEqual(['fcm-token-abcdef123', 'user-1']);
  });
});

describe('listDevices / token helpers', () => {
  it('lists active devices of the user', async () => {
    mockedQuery.mockResolvedValue([deviceRow]);
    const devices = await listDevices('user-1');

    expect(devices).toHaveLength(1);
    expect(devices[0]).toMatchObject({ id: 'device-1', isActive: true });
    const [sql, params] = mockedQuery.mock.calls[0];
    expect(sql).toContain('is_active = TRUE');
    expect(params).toEqual(['user-1']);
  });

  it('maps active device tokens for push fan-out', async () => {
    mockedQuery.mockResolvedValue([{ device_token: 't1' }, { device_token: 't2' }]);
    await expect(getActiveDeviceTokens('user-1')).resolves.toEqual(['t1', 't2']);
  });

  it('deactivates invalid FCM tokens without querying when the list is empty', async () => {
    await deactivateDeviceTokens('user-1', []);
    expect(mockedQuery).not.toHaveBeenCalled();

    mockedQuery.mockResolvedValue([]);
    await deactivateDeviceTokens('user-1', ['bad-token']);
    expect(mockedQuery).toHaveBeenCalledWith(expect.stringContaining('device_token = ANY'), [
      'user-1',
      ['bad-token'],
    ]);
  });
});

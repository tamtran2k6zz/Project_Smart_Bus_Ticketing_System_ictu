import { query } from '../config/database';
import { setIfAbsent } from '../config/redis';
import { deactivateDeviceTokens, getActiveDeviceTokens } from './device.service';
import { sendPushToTokens } from './fcm.service';
import { checkGeofencing } from './gps.service';
import {
  createNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notifyApproachingPassengers,
} from './notification.service';
import { sendToUser } from './websocket.service';

jest.mock('../config/database', () => ({ query: jest.fn() }));
jest.mock('../config/redis', () => ({ setIfAbsent: jest.fn() }));
jest.mock('./websocket.service', () => ({ sendToUser: jest.fn() }));
jest.mock('./fcm.service', () => ({ sendPushToTokens: jest.fn() }));
jest.mock('./device.service', () => ({
  getActiveDeviceTokens: jest.fn(),
  deactivateDeviceTokens: jest.fn(),
}));
jest.mock('./gps.service', () => ({ checkGeofencing: jest.fn() }));

const mockedQuery = query as unknown as jest.Mock;
const mockedSetIfAbsent = setIfAbsent as unknown as jest.Mock;
const mockedSendToUser = sendToUser as unknown as jest.Mock;
const mockedPush = sendPushToTokens as unknown as jest.Mock;
const mockedTokens = getActiveDeviceTokens as unknown as jest.Mock;
const mockedDeactivate = deactivateDeviceTokens as unknown as jest.Mock;
const mockedGeofence = checkGeofencing as unknown as jest.Mock;

const insertedRow = {
  id: 'notif-1',
  user_id: 'user-1',
  type: 'BUS_APPROACHING',
  title: 'Xe đang đến gần trạm',
  body: '...',
  data: { tripId: 'trip-1' },
  is_read: false,
  read_at: null,
  created_at: '2026-10-06T00:00:00.000Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedQuery.mockResolvedValue([insertedRow]);
  mockedSendToUser.mockReturnValue(true);
  mockedPush.mockResolvedValue([]);
  mockedTokens.mockResolvedValue([]);
  mockedDeactivate.mockResolvedValue(undefined);
  mockedSetIfAbsent.mockResolvedValue(true);
});

describe('createNotification', () => {
  it('inserts the row, pushes realtime and FCM, and deactivates invalid tokens', async () => {
    mockedTokens.mockResolvedValue(['token-1', 'token-2']);
    mockedPush.mockResolvedValue(['token-2']);

    const row = await createNotification('user-1', {
      type: 'BUS_APPROACHING',
      title: 'Xe đang đến gần trạm',
      body: 'Xe cách trạm 300 m',
      data: { tripId: 'trip-1' },
    });

    expect(row).toBe(insertedRow);
    const [sql, params] = mockedQuery.mock.calls[0];
    expect(sql).toContain('INSERT INTO notifications');
    expect(params[0]).toBe('user-1');
    expect(mockedSendToUser).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ event: 'notification' })
    );
    expect(mockedPush).toHaveBeenCalledWith(['token-1', 'token-2'], {
      title: 'Xe đang đến gần trạm',
      body: 'Xe cách trạm 300 m',
      data: expect.objectContaining({ tripId: 'trip-1', type: 'BUS_APPROACHING' }),
    });
    expect(mockedDeactivate).toHaveBeenCalledWith('user-1', ['token-2']);
  });

  it('still writes the row when no device token is registered', async () => {
    await createNotification('user-1', { type: 'T', title: 'Title' });
    expect(mockedPush).not.toHaveBeenCalled();
  });
});

describe('listNotifications / mark read', () => {
  it('clamps the page limit to 100 and returns the unread count', async () => {
    mockedQuery.mockResolvedValueOnce([insertedRow]).mockResolvedValueOnce([{ unread_count: 3 }]);

    const result = await listNotifications('user-1', { limit: 9999, offset: -5 });

    expect(result.unreadCount).toBe(3);
    // mock.calls[0] = [sql, paramsArray]
    const params = mockedQuery.mock.calls[0][1] as unknown[];
    expect(params[1]).toBe(100);
    expect(params[2]).toBe(0);
  });

  it('filters unread items when unreadOnly is set', async () => {
    mockedQuery.mockResolvedValueOnce([]).mockResolvedValueOnce([{ unread_count: 0 }]);
    await listNotifications('user-1', { unreadOnly: true });
    expect(mockedQuery.mock.calls[0][0]).toContain('is_read = FALSE');
  });

  it('returns null when marking a foreign or missing notification', async () => {
    mockedQuery.mockResolvedValue([]);
    await expect(markNotificationRead('user-1', 'nope')).resolves.toBeNull();
  });

  it('marks all notifications read and returns the affected count', async () => {
    mockedQuery.mockResolvedValue([{ id: 'n1' }, { id: 'n2' }]);
    await expect(markAllNotificationsRead('user-1')).resolves.toBe(2);
    expect(mockedQuery.mock.calls[0][0]).toContain('RETURNING id');
  });
});

describe('notifyApproachingPassengers', () => {
  const passengerRows = [
    { user_id: 'p1', ticket_code: 'TB-1', seat_number: 'A1' },
    { user_id: 'p2', ticket_code: 'TB-2', seat_number: 'A2' },
  ];
  const stopRows = [
    { id: 'stop-1', name: 'Bến Thành', latitude: 10.77, longitude: 106.7, sequence: 1 },
  ];

  it('does nothing when GPS coordinates are missing', async () => {
    await notifyApproachingPassengers('trip-1', null);
    expect(mockedSetIfAbsent).not.toHaveBeenCalled();
  });

  it('does nothing when the bus is outside every geofence', async () => {
    mockedQuery.mockResolvedValueOnce(stopRows);
    mockedGeofence.mockReturnValue(null); // checkGeofencing is synchronous

    await notifyApproachingPassengers('trip-outside', { latitude: 10.9, longitude: 106.8 });

    expect(mockedGeofence).toHaveBeenCalledWith(10.9, 106.8, stopRows, 300);
    expect(mockedSetIfAbsent).not.toHaveBeenCalled();
    expect(mockedSendToUser).not.toHaveBeenCalled();
  });

  it('notifies every passenger once when approaching a stop', async () => {
    // Unique trip id: route stops are cached module-level between tests.
    // 1st call: route stops; 2nd call: passengers; then one insert per passenger.
    mockedQuery
      .mockResolvedValueOnce(stopRows)
      .mockResolvedValueOnce(passengerRows)
      .mockResolvedValue([insertedRow]);
    mockedGeofence.mockReturnValue({
      stopId: 'stop-1',
      stopName: 'Bến Thành',
      distanceMeters: 250,
    });

    await notifyApproachingPassengers('trip-approach', { latitude: 10.77, longitude: 106.7 });

    expect(mockedSetIfAbsent).toHaveBeenCalledWith('notified:trip-approach:stop-1', '1', 600);
    expect(mockedSendToUser).toHaveBeenCalledTimes(2);
  });

  it('skips duplicate alerts while the idempotency key is held', async () => {
    mockedQuery.mockResolvedValueOnce(stopRows);
    mockedGeofence.mockReturnValue({
      stopId: 'stop-1',
      stopName: 'Bến Thành',
      distanceMeters: 250,
    });
    mockedSetIfAbsent.mockResolvedValue(false);

    await notifyApproachingPassengers('trip-dup', { latitude: 10.77, longitude: 106.7 });

    // Stops were loaded, but no passenger query / notification insert happened.
    expect(mockedQuery).toHaveBeenCalledTimes(1);
    expect(mockedSendToUser).not.toHaveBeenCalled();
  });
});

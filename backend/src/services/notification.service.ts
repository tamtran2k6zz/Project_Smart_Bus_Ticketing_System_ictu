import { query } from '../config/database';
import { createLogger } from '../config/logger';
import { setIfAbsent } from '../config/redis';
import { deactivateDeviceTokens, getActiveDeviceTokens } from './device.service';
import { sendPushToTokens } from './fcm.service';
import { checkGeofencing } from './gps.service';
import { sendToUser } from './websocket.service';

const logger = createLogger('notification-service');

/**
 * Sprint 3 — Thông báo hành khách (US 10).
 *
 * Luồng tạo thông báo:
 *  1. Ghi bền vào bảng notifications (nguồn sự thật).
 *  2. Đẩy realtime qua WebSocket (websocket.service.sendToUser).
 *  3. Đẩy FCM tới device token đang hoạt động (bỏ qua nếu chưa cấu hình).
 * Bước 2 và 3 là best-effort — lỗi không làm hỏng việc ghi DB.
 */
export interface CreateNotificationInput {
  type: string;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
}

const APPROACH_RADIUS_METERS = 300;
const DEDUP_TTL_SECONDS = 600;
const ROUTE_STOPS_CACHE_MS = 5 * 60 * 1000;

const routeStopsCache = new Map<
  string,
  {
    stops: Array<{
      id: string;
      name: string;
      latitude: number;
      longitude: number;
      sequence: number;
    }>;
    expiresAt: number;
  }
>();

function stringifyData(data?: Record<string, unknown>): Record<string, string> | undefined {
  if (!data) return undefined;
  const flat: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    flat[key] = typeof value === 'string' ? value : JSON.stringify(value);
  }
  return flat;
}

export async function createNotification(
  userId: string,
  input: CreateNotificationInput
): Promise<any> {
  const [row] = await query<any[]>(
    `INSERT INTO notifications (user_id, type, title, body, data)
     VALUES ($1,$2,$3,$4,$5::jsonb)
     RETURNING id, user_id, type, title, body, data, is_read, read_at, created_at`,
    [
      userId,
      input.type,
      input.title,
      input.body ?? null,
      input.data ? JSON.stringify(input.data) : null,
    ]
  );

  try {
    sendToUser(userId, { event: 'notification', notification: row });
  } catch (error) {
    logger.warn('realtime_notification_failed', { user_id: userId, error });
  }

  try {
    const tokens = await getActiveDeviceTokens(userId);
    if (tokens.length) {
      const invalidTokens = await sendPushToTokens(tokens, {
        title: input.title,
        body: input.body ?? '',
        data: stringifyData({ ...input.data, type: input.type }),
      });
      if (invalidTokens.length) await deactivateDeviceTokens(userId, invalidTokens);
    }
  } catch (error) {
    logger.warn('push_notification_failed', { user_id: userId, error });
  }

  logger.info('notification_created', { user_id: userId, type: input.type });
  return row;
}

export async function listNotifications(
  userId: string,
  options: { unreadOnly?: boolean; limit?: number; offset?: number } = {}
): Promise<{ items: any[]; unreadCount: number }> {
  const limit = Math.min(Math.max(Number(options.limit) || 20, 1), 100);
  const offset = Math.max(Number(options.offset) || 0, 0);
  const unreadFilter = options.unreadOnly ? 'AND is_read = FALSE' : '';
  const items = await query<any[]>(
    `SELECT id, user_id, type, title, body, data, is_read, read_at, created_at
     FROM notifications
     WHERE user_id = $1 ${unreadFilter}
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  const [{ unread_count }] = await query<Array<{ unread_count: number }>>(
    'SELECT count(*)::int AS unread_count FROM notifications WHERE user_id = $1 AND is_read = FALSE',
    [userId]
  );
  return { items, unreadCount: unread_count };
}

/** Trả về null khi thông báo không tồn tại hoặc thuộc người dùng khác. */
export async function markNotificationRead(userId: string, notificationId: string): Promise<any> {
  const [row] = await query<any[]>(
    `UPDATE notifications SET is_read = TRUE, read_at = NOW()
     WHERE id = $1 AND user_id = $2
     RETURNING id, user_id, type, title, body, data, is_read, read_at, created_at`,
    [notificationId, userId]
  );
  return row ?? null;
}

export async function markAllNotificationsRead(userId: string): Promise<number> {
  // query() trả về rows (không có rowCount) — dùng RETURNING để đếm affected.
  const updatedRows = await query<Array<{ id: string }>>(
    `UPDATE notifications SET is_read = TRUE, read_at = NOW()
     WHERE user_id = $1 AND is_read = FALSE
     RETURNING id`,
    [userId]
  );
  return updatedRows.length;
}

// ---------------------------------------------------------------------------
// US 10 — "Xe đang đến gần trạm": GPS service phát hiện xe trong vùng bán kính
// APPROACH_RADIUS_METERS của trạm → thông báo hành khách của chuyến đó.
// Idempotency: khóa Redis `notified:{tripId}:{stopId}` TTL 10 phút (fallback
// process-local) tránh gửi trùng khi GPS tick liên tiếp.
// ---------------------------------------------------------------------------

async function getRouteStopsForTrip(
  tripId: string
): Promise<
  Array<{ id: string; name: string; latitude: number; longitude: number; sequence: number }>
> {
  const cached = routeStopsCache.get(tripId);
  if (cached && cached.expiresAt > Date.now()) return cached.stops;

  const rows = await query<
    Array<{ id: string; name: string; latitude: number; longitude: number; sequence: number }>
  >(
    `SELECT bs.id, bs.name, bs.latitude, bs.longitude, rs.stop_order AS sequence
     FROM trips t
     JOIN route_stops rs ON rs.route_id = t.route_id
     JOIN bus_stops bs ON bs.id = rs.stop_id
     WHERE t.id = $1
     ORDER BY rs.stop_order ASC`,
    [tripId]
  );
  routeStopsCache.set(tripId, { stops: rows, expiresAt: Date.now() + ROUTE_STOPS_CACHE_MS });
  return rows;
}

export async function notifyApproachingPassengers(
  tripId: string,
  near: { latitude: number; longitude: number } | null | undefined
): Promise<void> {
  if (!near || !Number.isFinite(near.latitude) || !Number.isFinite(near.longitude)) return;

  const stops = await getRouteStopsForTrip(tripId);
  if (!stops.length) return;

  const nearest = checkGeofencing(near.latitude, near.longitude, stops, APPROACH_RADIUS_METERS);
  if (!nearest) return;

  // Idempotency: mỗi chuyến + trạm chỉ báo 1 lần trong 10 phút.
  const dedupKey = `notified:${tripId}:${nearest.stopId}`;
  const isFirst = await setIfAbsent(dedupKey, '1', DEDUP_TTL_SECONDS);
  if (!isFirst) return;

  const passengers = await query<
    Array<{ user_id: string; ticket_code: string; seat_number: string }>
  >(
    `SELECT user_id, ticket_code, seat_number
     FROM tickets
     WHERE trip_id = $1 AND user_id IS NOT NULL AND status IN ('BOOKED', 'CHECKED_IN')`,
    [tripId]
  );
  if (!passengers.length) return;

  const body = `Xe buýt đã cách trạm ${nearest.stopName} khoảng ${nearest.distanceMeters} m. Vui lòng tới trạm sớm.`;
  for (const passenger of passengers) {
    try {
      await createNotification(passenger.user_id, {
        type: 'BUS_APPROACHING',
        title: 'Xe đang đến gần trạm',
        body,
        data: { tripId, stopId: nearest.stopId, stopName: nearest.stopName },
      });
    } catch (error) {
      logger.error('approaching_passenger_notify_failed', {
        trip_id: tripId,
        stop_id: nearest.stopId,
        user_id: passenger.user_id,
        error,
      });
    }
  }
  logger.info('approaching_passengers_notified', {
    trip_id: tripId,
    stop_id: nearest.stopId,
    passengers: passengers.length,
  });
}

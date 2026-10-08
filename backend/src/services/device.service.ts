import { query } from '../config/database';
import { createLogger } from '../config/logger';

const logger = createLogger('device-service');

/**
 * Sprint 3 — Đăng ký device token (FCM) cho hành khách (US 10).
 * Token là duy nhất toàn hệ thống: đăng ký lại sẽ chuyển ownership về tài
 * khoản hiện tại (thiết bị đổi tài khoản / cài lại app).
 */
const SUPPORTED_PLATFORMS = ['ANDROID', 'IOS', 'WEB'];

export class DeviceError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'DeviceError';
  }
}

export interface RegisteredDevice {
  id: string;
  userId: string;
  platform: string;
  deviceName: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

function mapDevice(row: any): RegisteredDevice {
  return {
    id: row.id,
    userId: row.user_id,
    platform: row.platform,
    deviceName: row.device_name,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function registerDevice(
  userId: string,
  input: { deviceToken?: string; platform?: string; deviceName?: string }
): Promise<RegisteredDevice> {
  const token = (input.deviceToken ?? '').trim();
  if (token.length < 8 || token.length > 512) {
    throw new DeviceError(400, 'Device token không hợp lệ (từ 8 đến 512 ký tự).');
  }
  const platform = (input.platform ?? '').trim().toUpperCase();
  if (!SUPPORTED_PLATFORMS.includes(platform)) {
    throw new DeviceError(400, `Platform phải là một trong: ${SUPPORTED_PLATFORMS.join(', ')}.`);
  }
  const deviceName = (input.deviceName ?? '').trim().slice(0, 100) || null;

  const [row] = await query<any[]>(
    `INSERT INTO user_devices (user_id, device_token, platform, device_name)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (device_token) DO UPDATE SET
       user_id = EXCLUDED.user_id,
       platform = EXCLUDED.platform,
       device_name = EXCLUDED.device_name,
       is_active = TRUE,
       updated_at = NOW()
     RETURNING id, user_id, device_token, platform, device_name, is_active, created_at, updated_at`,
    [userId, token, platform, deviceName]
  );
  logger.info('device_registered', { user_id: userId, platform });
  return mapDevice(row);
}

/** Ghi nhận thiết bị đã gỡ push (idempotent): trả về số dòng bị deactivate. */
export async function unregisterDevice(userId: string, deviceToken: string): Promise<number> {
  const token = (deviceToken ?? '').trim();
  if (!token) throw new DeviceError(400, 'Vui lòng cung cấp device token.');
  // query() trả về rows (không có rowCount) — dùng RETURNING để đếm affected.
  const affectedRows = await query<Array<{ id: string }>>(
    `UPDATE user_devices SET is_active = FALSE, updated_at = NOW()
     WHERE device_token = $1 AND user_id = $2 AND is_active = TRUE
     RETURNING id`,
    [token, userId]
  );
  logger.info('device_unregistered', { user_id: userId, affected: affectedRows.length });
  return affectedRows.length;
}

export async function listDevices(userId: string): Promise<RegisteredDevice[]> {
  const rows = await query<any[]>(
    `SELECT id, user_id, device_token, platform, device_name, is_active, created_at, updated_at
     FROM user_devices
     WHERE user_id = $1 AND is_active = TRUE
     ORDER BY updated_at DESC`,
    [userId]
  );
  return rows.map(mapDevice);
}

/** Token đang hoạt động của một người dùng — dùng bởi notification.service. */
export async function getActiveDeviceTokens(userId: string): Promise<string[]> {
  const rows = await query<Array<{ device_token: string }>>(
    'SELECT device_token FROM user_devices WHERE user_id = $1 AND is_active = TRUE',
    [userId]
  );
  return rows.map(row => row.device_token);
}

/** Tắt các token FCM đã bị báo invalid khi push. */
export async function deactivateDeviceTokens(userId: string, tokens: string[]): Promise<void> {
  if (!tokens.length) return;
  await query(
    `UPDATE user_devices SET is_active = FALSE, updated_at = NOW()
     WHERE user_id = $1 AND device_token = ANY($2::text[])`,
    [userId, tokens]
  );
}

import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getMessaging, type Messaging } from 'firebase-admin/messaging';
import { readEnv } from '../config/env';
import { createLogger } from '../config/logger';

const logger = createLogger('fcm');

/**
 * Sprint 3 — Push notification qua Firebase Cloud Messaging.
 *
 * firebase-admin đã nằm trong dependencies. Dịch vụ khởi tạo lười (lazy) và
 * TẮT nhẹ nhàng khi thiếu cấu hình: notification.service vẫn ghi DB + WebSocket
 * realtime, chỉ không push FCM. Không bao giờ làm hỏng luồng tạo thông báo.
 *
 * Cấu hình (chọn một):
 *  - FIREBASE_SERVICE_ACCOUNT: chuỗi JSON service account (hoặc đường dẫn tệp)
 *  - GOOGLE_APPLICATION_CREDENTIALS: Application Default Credentials
 */
export type FcmStatus = 'DISABLED' | 'SERVICE_ACCOUNT' | 'APPLICATION_DEFAULT';

export interface FcmPushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

let messagingClient: Messaging | null = null;
let firebaseApp: App | null = null;
let initAttempted = false;

export function fcmStatus(): FcmStatus {
  if (readEnv('FIREBASE_SERVICE_ACCOUNT')) return 'SERVICE_ACCOUNT';
  if (readEnv('GOOGLE_APPLICATION_CREDENTIALS')) return 'APPLICATION_DEFAULT';
  return 'DISABLED';
}

function buildCredential(): ReturnType<typeof cert> | null {
  const raw = readEnv('FIREBASE_SERVICE_ACCOUNT');
  if (!raw) return null;
  try {
    return cert(JSON.parse(raw));
  } catch {
    // Không phải JSON — thử coi như đường dẫn tệp service account.
    return cert(raw);
  }
}

function getMessagingClient(): Messaging | null {
  if (initAttempted) return messagingClient;
  initAttempted = true;
  const status = fcmStatus();
  if (status === 'DISABLED') {
    logger.warn('fcm_disabled', {
      reason: 'FIREBASE_SERVICE_ACCOUNT / GOOGLE_APPLICATION_CREDENTIALS chưa được cấu hình',
      fallback: 'database-and-websocket-only',
    });
    return null;
  }
  try {
    const existingApp = getApps()[0];
    if (existingApp) {
      firebaseApp = existingApp;
    } else {
      const credential = buildCredential();
      firebaseApp = credential ? initializeApp({ credential }) : initializeApp();
    }
    messagingClient = getMessaging(firebaseApp);
    logger.info('fcm_initialized', { mode: status });
  } catch (error) {
    logger.error('fcm_init_failed', { error });
    messagingClient = null;
  }
  return messagingClient;
}

/**
 * Gửi push tới nhiều device token. Trả về danh sách token không còn hợp lệ
 * để notification.service đánh dấu deactivate trong user_devices.
 */
export async function sendPushToTokens(
  tokens: string[],
  payload: FcmPushPayload
): Promise<string[]> {
  if (!tokens.length) return [];
  const client = getMessagingClient();
  if (!client) return [];
  try {
    const response = await client.sendEachForMulticast({
      tokens,
      notification: { title: payload.title, body: payload.body },
      data: payload.data,
      android: { priority: 'high' },
      apns: { payload: { aps: { sound: 'default' } } },
    });
    const invalidTokens: string[] = [];
    response.responses.forEach((item, index) => {
      if (item.success) return;
      const code = String((item.error as { code?: string } | undefined)?.code ?? '');
      if (code.includes('registration-token') || code.includes('not-registered')) {
        invalidTokens.push(tokens[index]);
      }
    });
    logger.info('fcm_push_sent', {
      total: tokens.length,
      success: response.successCount,
      failure: response.failureCount,
    });
    return invalidTokens;
  } catch (error) {
    logger.error('fcm_push_failed', { error });
    return [];
  }
}

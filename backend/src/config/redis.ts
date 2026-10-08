import { createClient } from 'redis';
import { randomUUID } from 'crypto';
import { describeRedisTarget } from './env';
import { appLogger } from './logger';

const logger = appLogger.child('redis');

// Seat locking is optional: without Redis the PostgreSQL row lock in
// services/booking.ts remains the concurrency guard. Redis only adds a
// cross-instance SET NX lock when it is explicitly configured.
const target = describeRedisTarget();
const redisClient = target.configured
  ? createClient({
      url: target.url,
      socket: {
        reconnectStrategy: retries => Math.min(1000 * 2 ** retries, 30_000),
      },
    })
  : null;

redisClient?.on('error', error => {
  logger.error('client_error', { error, url: target.url });
});

export function redisStatus(): 'DISABLED' | 'CONNECTING' | 'READY' | 'RECONNECTING' {
  if (!redisClient) return 'DISABLED';
  if (redisClient.isReady) return 'READY';
  return redisClient.isOpen ? 'RECONNECTING' : 'CONNECTING';
}

export function redisSeatLockEnabled(): boolean {
  return redisClient !== null;
}

export async function connectRedis(): Promise<void> {
  if (!redisClient) {
    logger.warn('seat_lock_disabled', {
      reason: 'REDIS_URL / REDIS_HOST chưa được cấu hình',
      fallback: 'postgres-row-lock',
    });
    return;
  }
  if (!redisClient.isOpen) {
    logger.info('connecting', { url: target.url });
    await redisClient.connect();
    logger.info('connected', { url: target.url });
  }
}

export async function acquireSeatLock(
  tripId: string,
  seatNumber: string,
  ownerId: string,
  ttlSeconds = 600
): Promise<string | null> {
  if (!redisClient) return 'redis-disabled';
  if (!redisClient.isReady) {
    logger.error('seat_lock_unavailable', {
      trip_id: tripId,
      seat_number: seatNumber,
      owner_id: ownerId,
      redis_status: redisStatus(),
      url: target.url,
    });
    throw new Error('Redis is configured but unavailable.');
  }
  const key = `lock:trip:${tripId}:seat:${seatNumber}`;
  const existing = await redisClient.get(key);
  if (existing && existing.startsWith(`${ownerId}:`)) {
    await redisClient.expire(key, ttlSeconds);
    logger.debug('seat_lock_reentered', {
      trip_id: tripId,
      seat_number: seatNumber,
      owner_id: ownerId,
    });
    return existing;
  }

  const lockId = `${ownerId}:${randomUUID()}`;
  const result = await redisClient.set(key, lockId, {
    NX: true,
    EX: ttlSeconds,
  });
  if (result === 'OK') {
    logger.debug('seat_lock_acquired', {
      trip_id: tripId,
      seat_number: seatNumber,
      owner_id: ownerId,
    });
    return lockId;
  }
  logger.warn('seat_lock_conflict', {
    trip_id: tripId,
    seat_number: seatNumber,
    owner_id: ownerId,
  });
  return null;
}

export async function releaseSeatLock(
  tripId: string,
  seatNumber: string,
  lockId?: string
): Promise<void> {
  if (!redisClient?.isReady) return;
  const key = `lock:trip:${tripId}:seat:${seatNumber}`;
  if (!lockId) {
    await redisClient.del(key);
    return;
  }
  await redisClient.eval(
    "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
    { keys: [key], arguments: [lockId] }
  );
}

/**
 * Sprint 3: khóa phân tán khi soát vé QR — chống hai thiết bị quét cùng lúc.
 * Trả về lockId (kèm 'redis-disabled'/'redis-unavailable' khi không có Redis
 * → caller vẫn tiếp tục vì PostgreSQL SELECT ... FOR UPDATE là chốt chặn cuối).
 * Trả về null nghĩa là thiết bị khác đang giữ khóa (caller trả 409).
 */
export async function acquireTicketValidationLock(
  code: string,
  ownerId: string,
  ttlSeconds = 5
): Promise<string | null> {
  if (!redisClient) return 'redis-disabled';
  if (!redisClient.isReady) {
    logger.error('ticket_lock_unavailable', {
      code,
      owner_id: ownerId,
      redis_status: redisStatus(),
      fallback: 'postgres-row-lock',
    });
    return 'redis-unavailable';
  }
  const key = `lock:ticket:scan:${code}`;
  const lockId = `${ownerId}:${randomUUID()}`;
  const result = await redisClient.set(key, lockId, { NX: true, EX: ttlSeconds });
  if (result === 'OK') {
    logger.debug('ticket_lock_acquired', { code, owner_id: ownerId });
    return lockId;
  }
  logger.warn('ticket_lock_conflict', { code, owner_id: ownerId });
  return null;
}

export async function releaseTicketValidationLock(code: string, lockId?: string): Promise<void> {
  if (!redisClient?.isReady) return;
  const key = `lock:ticket:scan:${code}`;
  if (!lockId) {
    await redisClient.del(key);
    return;
  }
  await redisClient.eval(
    "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
    { keys: [key], arguments: [lockId] }
  );
}

// Sprint 3: idempotency flags (notification dedup, ...)
// Without Redis the process-local fallback still protects a single instance;
// multi-instance deployments need Redis for cross-instance deduplication.
const memoryFlags = new Map<string, number>();

export async function setIfAbsent(
  key: string,
  value: string,
  ttlSeconds: number
): Promise<boolean> {
  if (redisClient?.isReady) {
    try {
      const result = await redisClient.set(key, value, { NX: true, EX: ttlSeconds });
      return result === 'OK';
    } catch (error) {
      logger.error('set_if_absent_failed', { key, error });
    }
  }
  const now = Date.now();
  const expiresAt = memoryFlags.get(key);
  if (expiresAt && expiresAt > now) return false;
  if (memoryFlags.size > 1000) {
    for (const [flagKey, flagExpiry] of memoryFlags) {
      if (flagExpiry <= now) memoryFlags.delete(flagKey);
    }
  }
  memoryFlags.set(key, now + ttlSeconds * 1000);
  return true;
}

export async function closeRedis(): Promise<void> {
  if (!redisClient?.isOpen) return;
  if (redisClient.isReady) await redisClient.quit();
  else redisClient.disconnect();
}

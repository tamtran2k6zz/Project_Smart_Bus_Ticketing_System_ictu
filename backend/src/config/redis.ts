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
  const lockId = `${ownerId}:${randomUUID()}`;
  const result = await redisClient.set(`lock:trip:${tripId}:seat:${seatNumber}`, lockId, {
    NX: true,
    EX: ttlSeconds,
  });
  if (result === 'OK') {
    logger.debug('seat_lock_acquired', { trip_id: tripId, seat_number: seatNumber, owner_id: ownerId });
    return lockId;
  }
  logger.warn('seat_lock_conflict', { trip_id: tripId, seat_number: seatNumber, owner_id: ownerId });
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

export async function closeRedis(): Promise<void> {
  if (!redisClient?.isOpen) return;
  if (redisClient.isReady) await redisClient.quit();
  else redisClient.disconnect();
}

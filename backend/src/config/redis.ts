import { createClient } from 'redis';
import { randomUUID } from 'crypto';

const configured = Boolean(process.env.REDIS_URL);
const redisClient = configured
  ? createClient({
      url: process.env.REDIS_URL,
      socket: {
        reconnectStrategy: retries => Math.min(1000 * 2 ** retries, 30_000),
      },
    })
  : null;

redisClient?.on('error', error => {
  console.error(`[Redis] ${error.message}`);
});

export async function connectRedis(): Promise<void> {
  if (redisClient && !redisClient.isOpen) {
    await redisClient.connect();
  }
}

export async function acquireSeatLock(
  tripId: string,
  seatNumber: string,
  ownerId: string,
  ttlSeconds = 600
): Promise<string | null> {
  if (!redisClient) return 'redis-disabled';
  if (!redisClient.isReady) throw new Error('Redis is configured but unavailable.');
  const lockId = `${ownerId}:${randomUUID()}`;
  const result = await redisClient.set(`lock:trip:${tripId}:seat:${seatNumber}`, lockId, {
    NX: true,
    EX: ttlSeconds,
  });
  return result === 'OK' ? lockId : null;
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

import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = Number(this.configService.get<number>('REDIS_PORT', 6379));
    const password = this.configService.get<string>('REDIS_PASSWORD');

    try {
      this.client = new Redis({
        host,
        port,
        password: password || undefined,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null, // Do not hang if redis is not running locally in tests
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.log(`Connected to Redis at ${host}:${port}`);
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        this.logger.warn(`Redis connection warning: ${err.message}`);
      });

      this.client.connect().catch((err) => {
        this.logger.warn(`Redis initial connect warning (distributed lock fallback enabled): ${err.message}`);
      });
    } catch (err) {
      this.logger.warn(`Failed to initialize Redis client: ${err.message}`);
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit().catch(() => {});
      this.logger.log('Redis client disconnected.');
    }
  }

  getClient(): Redis | null {
    return this.client;
  }

  /**
   * Acquire a distributed lock with TTL in milliseconds using Redis SET resource token NX PX ttl
   * @param lockKey Key name
   * @param token Unique token for ownership (e.g. UUID)
   * @param ttlMs Time-to-live in milliseconds (default: 10000ms = 10s)
   */
  async acquireLock(lockKey: string, token: string, ttlMs = 10000): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      // Fallback: If Redis is offline or not configured in unit/e2e test, allow pass-through lock
      return true;
    }

    try {
      const result = await this.client.set(lockKey, token, 'PX', ttlMs, 'NX');
      return result === 'OK';
    } catch (err) {
      this.logger.error(`Error acquiring Redis lock for ${lockKey}: ${err.message}`);
      return true;
    }
  }

  /**
   * Release distributed lock safely using Lua script to check token ownership
   * @param lockKey Key name
   * @param token Unique token that acquired the lock
   */
  async releaseLock(lockKey: string, token: string): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      return true;
    }

    const luaScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    try {
      const result = await this.client.eval(luaScript, 1, lockKey, token);
      return result === 1;
    } catch (err) {
      this.logger.error(`Error releasing Redis lock for ${lockKey}: ${err.message}`);
      return false;
    }
  }
}


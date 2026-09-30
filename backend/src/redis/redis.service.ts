import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createClient } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: {
      reconnectStrategy: retries => {
        const delay = Math.min(1000 * 2 ** retries, 30_000);
        this.logger.warn(`Redis reconnect attempt ${retries + 1} in ${delay}ms`);
        return delay;
      },
    },
  });

  constructor() {
    this.client.on('error', error => {
      this.logger.error(`Redis client error: ${error.message}`);
    });
    this.client.on('ready', () => {
      this.logger.log('Redis connection is ready');
    });
    this.client.on('reconnecting', () => {
      this.logger.warn('Redis connection lost; reconnecting');
    });
  }

  get isReady(): boolean {
    return this.client.isReady;
  }

  getClient() {
    return this.client;
  }

  onModuleInit(): void {
    this.start();
  }

  start(): void {
    if (this.client.isOpen) {
      return;
    }

    void this.client.connect().catch((error: Error) => {
      this.logger.error(`Unable to connect to Redis: ${error.message}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.client.isOpen) {
      return;
    }

    if (this.client.isReady) {
      await this.client.quit();
      return;
    }

    this.client.disconnect();
  }
}

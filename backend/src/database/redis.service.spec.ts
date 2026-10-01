import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from './redis.service';
import { ConfigService } from '@nestjs/config';

describe('RedisService', () => {
  let service: RedisService;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        if (key === 'REDIS_HOST') return 'localhost';
        if (key === 'REDIS_PORT') return 6379;
        if (key === 'REDIS_PASSWORD') return '';
        return defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
  });

  it('Khởi tạo service và kết nối Redis fallback an toàn', () => {
    service.onModuleInit();
    expect(service).toBeDefined();
    expect(service.getClient()).toBeDefined();
  });

  it('acquireLock và releaseLock hoạt động an toàn khi client fallback', async () => {
    const lockAcquired = await service.acquireLock('lock:test:1', 'token-123', 5000);
    expect(typeof lockAcquired).toBe('boolean');

    const lockReleased = await service.releaseLock('lock:test:1', 'token-123');
    expect(typeof lockReleased).toBe('boolean');
  });

  it('Ngắt kết nối an toàn khi destroy module', async () => {
    await service.onModuleDestroy();
    expect(service).toBeDefined();
  });
});


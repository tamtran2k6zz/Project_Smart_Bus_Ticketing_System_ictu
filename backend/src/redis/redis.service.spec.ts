import { createClient } from 'redis';
import { RedisService } from './redis.service';

jest.mock('redis', () => ({
  createClient: jest.fn(),
}));

describe('RedisService', () => {
  const client = {
    isOpen: false,
    isReady: false,
    on: jest.fn().mockReturnThis(),
    connect: jest.fn().mockResolvedValue(undefined),
    quit: jest.fn().mockResolvedValue('OK'),
    disconnect: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    client.isOpen = false;
    client.isReady = false;
    (createClient as jest.Mock).mockReturnValue(client);
  });

  it('configures capped exponential retries', () => {
    new RedisService();

    const options = (createClient as jest.Mock).mock.calls[0][0];
    expect(options.socket.reconnectStrategy(0)).toBe(1000);
    expect(options.socket.reconnectStrategy(5)).toBe(30_000);
  });

  it('starts connecting only when the client is not already open', () => {
    const service = new RedisService();

    service.start();
    expect(client.connect).toHaveBeenCalledTimes(1);

    client.isOpen = true;
    service.start();
    expect(client.connect).toHaveBeenCalledTimes(1);
  });

  it('closes a ready client gracefully', async () => {
    const service = new RedisService();
    client.isOpen = true;
    client.isReady = true;

    await service.onModuleDestroy();

    expect(client.quit).toHaveBeenCalledTimes(1);
    expect(client.disconnect).not.toHaveBeenCalled();
  });
});

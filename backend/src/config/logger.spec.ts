import { appLogger, createLogger, maskUrlCredentials } from './logger';

describe('config/logger', () => {
  const originalEnv = { ...process.env };
  let lines: string[];
  beforeEach(() => {
    process.env.LOG_LEVEL = 'debug';
    lines = [];
    const capture = (line: string) => {
      lines.push(line);
    };
    jest.spyOn(console, 'log').mockImplementation(capture);
    jest.spyOn(console, 'warn').mockImplementation(capture);
    jest.spyOn(console, 'error').mockImplementation(capture);
  });

  afterEach(() => jest.restoreAllMocks());
  afterAll(() => {
    process.env = originalEnv;
  });

  it('never starts a line with square brackets (PowerShell-safe)', () => {
    appLogger.child('ticketing').error('booking_failed', { table: 'tickets' });
    expect(lines).toHaveLength(1);
    expect(lines[0]).not.toMatch(/^\s*\[/);
    expect(lines[0]).toContain('scope=smartbus.ticketing');
    expect(lines[0]).toContain('event=booking_failed');
    expect(lines[0]).toContain('table=tickets');
  });

  it('quotes values containing spaces so the key=value format stays parseable', () => {
    createLogger('test').info('event', { detail: 'two words' });
    expect(lines[0]).toContain('detail="two words"');
  });

  it('masks secrets and URL credentials', () => {
    createLogger('test').info('event', {
      VNPAY_HASH_SECRET: 'super-secret',
      password: 'hunter2',
      url: 'postgresql://user:pw@db.example:5432/postgres',
    });
    const line = lines[0];
    expect(line).not.toContain('super-secret');
    expect(line).not.toContain('hunter2');
    expect(line).not.toContain('user:pw');
    expect(line).toContain('***');
  });

  it('reports error name, message and http status', () => {
    const error = Object.assign(new Error('boom'), { status: 409 });
    createLogger('test').error('failed', { error });
    expect(lines[0]).toContain('name=Error');
    expect(lines[0]).toContain('boom');
    expect(lines[0]).toContain('http_status=409');
  });

  it('honours LOG_LEVEL', () => {
    process.env.LOG_LEVEL = 'warn';
    const logger = createLogger('test');
    logger.debug('hidden');
    logger.info('hidden');
    logger.warn('shown');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('event=shown');
  });

  it('masks credentials inside URLs', () => {
    expect(maskUrlCredentials('redis://:pw@cache:6379')).toBe('redis://***:***@cache:6379');
  });
});

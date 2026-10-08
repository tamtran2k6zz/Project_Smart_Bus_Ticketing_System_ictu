import {
  collectEnvironmentIssues,
  describeDatabaseTarget,
  describeRedisTarget,
  getGatewayCallbacks,
  getPublicBaseUrl,
  readGatewayEnv,
} from './env';

describe('config/env', () => {
  const originalEnv = { ...process.env };
  const gatewayKeys = [
    'VNPAY_TMN_CODE',
    'VNPAY_HASH_SECRET',
    'VNPAY_RETURN_URL',
    'VNPAY_IPN_URL',
    'VNP_TMN_CODE',
    'VNP_HASH_SECRET',
    'VNP_RETURN_URL',
    'VNP_IPN_URL',
    'REDIS_URL',
    'REDIS_HOST',
    'REDIS_PORT',
    'REDIS_PASSWORD',
    'PAYMENT_PUBLIC_BASE_URL',
    'VERCEL_URL',
    'PORT',
    'MOMO_REDIRECT_URL',
    'MOMO_IPN_URL',
    'PAYMENT_RESULT_URL',
  ];

  beforeEach(() => {
    for (const key of gatewayKeys) delete process.env[key];
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('accepts REDIS_URL and ignores the host triplet', () => {
    process.env.REDIS_URL = 'redis://cache:6379';
    expect(describeRedisTarget()).toEqual({
      configured: true,
      source: 'REDIS_URL',
      url: 'redis://cache:6379',
    });
  });

  it('builds a URL from REDIS_HOST/PORT/PASSWORD so Redis is never silently off', () => {
    process.env.REDIS_HOST = 'localhost';
    process.env.REDIS_PORT = '6380';
    process.env.REDIS_PASSWORD = 's3cret';
    expect(describeRedisTarget()).toEqual({
      configured: true,
      source: 'REDIS_HOST',
      url: 'redis://:s3cret@localhost:6380',
    });
  });

  it('reports Redis as disabled only when nothing is configured', () => {
    expect(describeRedisTarget()).toEqual({ configured: false, source: 'none', url: '' });
  });

  it('rejects a non-PostgreSQL DATABASE_URL', () => {
    process.env.DATABASE_URL = 'mysql://root:pw@localhost:3306/smartbus';
    process.env.JWT_SECRET = 'a'.repeat(32);
    const issues = collectEnvironmentIssues();
    expect(issues).toContainEqual(
      expect.objectContaining({ level: 'error', variable: 'DATABASE_URL' })
    );
  });

  it('accepts a Supabase postgresql pooler URL', () => {
    process.env.DATABASE_URL =
      'postgresql://postgres.abc:pw@aws-0-ap.pooler.supabase.com:6543/postgres';
    process.env.JWT_SECRET = 'a'.repeat(32);
    expect(collectEnvironmentIssues().filter(issue => issue.level === 'error')).toEqual([]);
    expect(describeDatabaseTarget()).toMatchObject({
      driver: 'postgresql',
      port: '6543',
      database: 'postgres',
    });
  });

  it('requires a JWT secret of at least 32 characters', () => {
    process.env.DATABASE_URL = 'postgresql://u:p@localhost:5432/postgres';
    process.env.JWT_SECRET = 'too-short';
    expect(collectEnvironmentIssues()).toContainEqual(
      expect.objectContaining({ level: 'error', variable: 'JWT_SECRET' })
    );
  });

  it('prefers the canonical VNPAY_ name over the legacy VNP_ alias', () => {
    process.env.VNP_HASH_SECRET = 'legacy';
    process.env.VNPAY_HASH_SECRET = 'canonical';
    expect(readGatewayEnv('VNPAY_HASH_SECRET')).toBe('canonical');
  });

  it('falls back to the legacy VNP_ alias when the canonical name is missing', () => {
    process.env.VNP_HASH_SECRET = 'legacy';
    expect(readGatewayEnv('VNPAY_HASH_SECRET')).toBe('legacy');
  });

  it('derives the public base URL from VERCEL_URL before falling back to localhost', () => {
    process.env.VERCEL_URL = 'my-app.vercel.app';
    expect(getPublicBaseUrl()).toBe('https://my-app.vercel.app');
    process.env.PAYMENT_PUBLIC_BASE_URL = 'https://tunnel.example.dev/';
    expect(getPublicBaseUrl()).toBe('https://tunnel.example.dev');
  });

  it('defaults every callback to the route the Express app actually serves', () => {
    process.env.PORT = '5000';
    expect(getGatewayCallbacks()).toEqual({
      vnpayReturnUrl: 'http://localhost:5000/api/v1/ticketing/payments/vnpay/return',
      vnpayIpnUrl: 'http://localhost:5000/api/v1/ticketing/payments/vnpay/ipn',
      momoRedirectUrl: 'http://localhost:5000/payment/result',
      momoIpnUrl: 'http://localhost:5000/api/v1/ticketing/payments/momo/ipn',
      paymentResultUrl: 'http://localhost:5000/payment/result',
    });
  });

  it('warns when a gateway callback points at localhost', () => {
    process.env.DATABASE_URL = 'postgresql://u:p@localhost:5432/postgres';
    process.env.JWT_SECRET = 'a'.repeat(32);
    process.env.PORT = '5000';
    const variables = collectEnvironmentIssues()
      .filter(issue => issue.level === 'warning')
      .map(issue => issue.variable);
    expect(variables).toContain('VNPAY_RETURN_URL');
    expect(variables).toContain('VNPAY_IPN_URL');
    expect(variables).toContain('REDIS_URL');
  });

  it('does not warn about localhost once a public base URL is configured', () => {
    process.env.DATABASE_URL = 'postgresql://u:p@localhost:5432/postgres';
    process.env.JWT_SECRET = 'a'.repeat(32);
    process.env.PAYMENT_PUBLIC_BASE_URL = 'https://tunnel.example.dev';
    process.env.REDIS_URL = 'redis://localhost:6379';
    const variables = collectEnvironmentIssues()
      .filter(issue => issue.level === 'warning')
      .map(issue => issue.variable);
    expect(variables).not.toContain('VNPAY_RETURN_URL');
    expect(variables).not.toContain('VNPAY_IPN_URL');
  });
});

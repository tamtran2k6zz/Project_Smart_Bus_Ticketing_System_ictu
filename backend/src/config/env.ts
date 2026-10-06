/**
 * Single source of truth for environment configuration.
 *
 * Every module reads settings through this file so that:
 *  - one variable name is used everywhere (no VNP_* vs VNPAY_* drift),
 *  - a missing or contradictory setting fails loudly at boot instead of
 *    silently disabling a feature at the first request,
 *  - secrets are never printed in logs.
 */
import 'dotenv/config';
import { appLogger, maskUrlCredentials } from './logger';

const logger = appLogger.child('config');

export function readEnv(name: string): string | undefined {
  const raw = process.env[name];
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  return trimmed.length ? trimmed : undefined;
}

export function isProduction(): boolean {
  return (readEnv('NODE_ENV') || 'development') === 'production';
}

/**
 * Legacy aliases kept only so an old .env still boots, while the canonical
 * VNPAY_ and MOMO_ variable names always win.
 */
const LEGACY_ALIASES: Record<string, string> = {
  VNP_TMN_CODE: 'VNPAY_TMN_CODE',
  VNP_HASH_SECRET: 'VNPAY_HASH_SECRET',
  VNP_URL: 'VNPAY_PAYMENT_URL',
  VNP_RETURN_URL: 'VNPAY_RETURN_URL',
  VNP_IPN_URL: 'VNPAY_IPN_URL',
};

export function readGatewayEnv(canonicalName: string): string | undefined {
  const canonical = readEnv(canonicalName);
  if (canonical) return canonical;
  const legacyName = Object.keys(LEGACY_ALIASES).find(key => LEGACY_ALIASES[key] === canonicalName);
  if (!legacyName) return undefined;
  const legacy = readEnv(legacyName);
  if (legacy) {
    logger.warn('deprecated_env_alias_used', { legacy: legacyName, canonical: canonicalName });
  }
  return legacy;
}

export function requireGatewayEnv(name: string): string {
  const value = readGatewayEnv(name);
  if (!value) throw new Error(`Thiếu cấu hình bắt buộc ${name}.`);
  return value;
}

export interface DatabaseTarget {
  configured: boolean;
  driver: string;
  host: string;
  port: string;
  database: string;
  poolMax: number;
}

/** Describe the PostgreSQL target without ever exposing the password. */
export function describeDatabaseTarget(): DatabaseTarget {
  const connectionString = readEnv('DATABASE_URL');
  if (!connectionString) {
    return {
      configured: false,
      driver: 'postgresql',
      host: 'unset',
      port: 'unset',
      database: 'unset',
      poolMax: 0,
    };
  }
  let driver = 'postgresql';
  let host = 'unknown';
  let port = 'unknown';
  let database = 'unknown';
  try {
    const url = new URL(connectionString);
    driver = url.protocol.replace(':', '');
    host = url.hostname;
    port = url.port || '5432';
    database = url.pathname.replace(/^\//, '') || 'unknown';
  } catch {
    driver = 'unparseable';
  }
  return {
    configured: true,
    driver,
    host,
    port,
    database,
    poolMax: Number(readEnv('DB_POOL_MAX') || (isProduction() ? 2 : 10)),
  };
}

export interface RedisTarget {
  configured: boolean;
  source: 'REDIS_URL' | 'REDIS_HOST' | 'none';
  url: string;
}

/**
 * Accept both REDIS_URL and the REDIS_HOST/REDIS_PORT/REDIS_PASSWORD triplet so
 * a deployment cannot silently run with Redis disabled.
 */
export function describeRedisTarget(): RedisTarget {
  const url = readEnv('REDIS_URL');
  if (url) return { configured: true, source: 'REDIS_URL', url };
  const host = readEnv('REDIS_HOST');
  if (!host) return { configured: false, source: 'none', url: '' };
  const port = readEnv('REDIS_PORT') || '6379';
  const password = readEnv('REDIS_PASSWORD');
  const credentials = password ? `:${encodeURIComponent(password)}@` : '';
  return { configured: true, source: 'REDIS_HOST', url: `redis://${credentials}${host}:${port}` };
}

/** Public HTTPS origin the payment gateways must be able to reach. */
export function getPublicBaseUrl(): string {
  const configured = readEnv('PAYMENT_PUBLIC_BASE_URL') || readEnv('PUBLIC_API_BASE_URL');
  if (configured) return configured.replace(/\/+$/, '');
  const vercelUrl = readEnv('VERCEL_URL');
  if (vercelUrl) return `https://${vercelUrl.replace(/\/+$/, '')}`;
  return `http://localhost:${readEnv('PORT') || '5000'}`;
}
export interface GatewayCallbacks {
  vnpayReturnUrl: string;
  vnpayIpnUrl: string;
  momoRedirectUrl: string;
  momoIpnUrl: string;
  paymentResultUrl: string;
}

/**
 * Canonical callback endpoints served by the Express API.
 * Routes are declared in src/routes/ticketing.routes.ts - keep both in sync.
 */
export function getGatewayCallbacks(): GatewayCallbacks {
  const base = getPublicBaseUrl();
  return {
    vnpayReturnUrl:
      readGatewayEnv('VNPAY_RETURN_URL') || `${base}/api/v1/ticketing/payments/vnpay/return`,
    vnpayIpnUrl: readGatewayEnv('VNPAY_IPN_URL') || `${base}/api/v1/ticketing/payments/vnpay/ipn`,
    momoRedirectUrl: readGatewayEnv('MOMO_REDIRECT_URL') || `${base}/payment/result`,
    momoIpnUrl: readGatewayEnv('MOMO_IPN_URL') || `${base}/api/v1/ticketing/payments/momo/ipn`,
    paymentResultUrl: readGatewayEnv('PAYMENT_RESULT_URL') || `${base}/payment/result`,
  };
}

function isLoopback(url: string): boolean {
  try {
    const { hostname, protocol } = new URL(url);
    return protocol === 'http:' && ['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(hostname);
  } catch {
    return false;
  }
}

export interface EnvIssue {
  level: 'error' | 'warning';
  variable: string;
  message: string;
}

export function collectEnvironmentIssues(): EnvIssue[] {
  const issues: EnvIssue[] = [];
  const database = describeDatabaseTarget();
  if (!database.configured) {
    issues.push({
      level: 'error',
      variable: 'DATABASE_URL',
      message: 'Thiếu DATABASE_URL (Supabase PostgreSQL).',
    });
  } else if (database.driver !== 'postgresql') {
    issues.push({
      level: 'error',
      variable: 'DATABASE_URL',
      message: `DATABASE_URL phải là postgresql:// của Supabase, hiện là ${database.driver}://.`,
    });
  }
  const jwtSecret = readEnv('JWT_SECRET');
  if (!jwtSecret || jwtSecret.length < 32) {
    issues.push({
      level: 'error',
      variable: 'JWT_SECRET',
      message: 'JWT_SECRET phải là chuỗi bí mật ngẫu nhiên dài ít nhất 32 ký tự.',
    });
  }
  if (!describeRedisTarget().configured) {
    issues.push({
      level: 'warning',
      variable: 'REDIS_URL',
      message:
        'Redis chưa cấu hình: khoá ghế tạm chỉ dựa vào PostgreSQL và không đồng bộ giữa nhiều máy.',
    });
  }
  const callbacks = getGatewayCallbacks();
  for (const [variable, url] of Object.entries({
    VNPAY_RETURN_URL: callbacks.vnpayReturnUrl,
    VNPAY_IPN_URL: callbacks.vnpayIpnUrl,
    MOMO_IPN_URL: callbacks.momoIpnUrl,
  })) {
    if (isLoopback(url)) {
      issues.push({
        level: 'warning',
        variable,
        message:
          'Đang trỏ localhost nên cổng thanh toán không gọi được vào máy. ' +
          'Dùng URL public (ngrok/cloudflared hoặc domain Vercel) và đăng ký IPN trên cổng.',
      });
    }
  }
  if (!readEnv('PAYMENT_CRON_SECRET') && !readEnv('CRON_SECRET') && isProduction()) {
    issues.push({
      level: 'error',
      variable: 'PAYMENT_CRON_SECRET',
      message: 'Bắt buộc ở môi trường production cho endpoint release-expired.',
    });
  }
  return issues;
}

/** Print a boot summary so a missing integration is visible immediately. */
export function logEnvironmentSummary(): void {
  const database = describeDatabaseTarget();
  const redis = describeRedisTarget();
  logger.info('database_target', {
    driver: database.driver,
    host: database.host,
    port: database.port,
    database: database.database,
    pool_max: database.poolMax,
  });
  logger.info('redis_target', {
    configured: redis.configured,
    source: redis.source,
    url: maskUrlCredentials(redis.url),
    seat_lock_mode: redis.configured ? 'redis-and-postgresql' : 'postgresql-only',
  });
  const callbacks = getGatewayCallbacks();
  logger.info('payment_callbacks', {
    vnpay_return_url: callbacks.vnpayReturnUrl,
    vnpay_ipn_url: callbacks.vnpayIpnUrl,
    momo_ipn_url: callbacks.momoIpnUrl,
    payment_result_url: callbacks.paymentResultUrl,
    vnpay_configured: Boolean(
      readGatewayEnv('VNPAY_TMN_CODE') && readGatewayEnv('VNPAY_HASH_SECRET')
    ),
    momo_configured: Boolean(
      readGatewayEnv('MOMO_PARTNER_CODE') &&
      readGatewayEnv('MOMO_ACCESS_KEY') &&
      readGatewayEnv('MOMO_SECRET_KEY')
    ),
  });
  for (const issue of collectEnvironmentIssues()) {
    const payload = { variable: issue.variable, detail: issue.message };
    if (issue.level === 'error') logger.error('environment_invalid', payload);
    else logger.warn('environment_warning', payload);
  }
}

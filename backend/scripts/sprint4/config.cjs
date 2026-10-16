const path = require('node:path');
const { randomBytes } = require('node:crypto');

function loopback(url, protocols) {
  const parsed = new URL(url);
  if (
    !protocols.includes(parsed.protocol) ||
    !['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname)
  )
    throw new Error(
      'Sprint 4 runner only accepts local isolated services. Never point it at production.'
    );
  return parsed;
}
function settings(env = process.env) {
  const databaseUrl =
    env.SPRINT4_DATABASE_URL ||
    'postgresql://sprint4:sprint4-local-only@127.0.0.1:6544/smartbus_sprint4_test';
  const database = loopback(databaseUrl, ['postgres:', 'postgresql:']);
  if (database.pathname !== '/smartbus_sprint4_test')
    throw new Error('Dedicated smartbus_sprint4_test control database required.');
  const redisUrl = env.SPRINT4_REDIS_URL || 'redis://127.0.0.1:6381';
  loopback(redisUrl, ['redis:']);
  const seconds = Number(env.SPRINT4_SEARCH_SECONDS || 30);
  const soakSeconds = Number(env.SPRINT4_SOAK_SECONDS || 60);
  const latencyMs = Number(env.SPRINT4_API_P95_MS || 150);
  if (
    ![seconds, soakSeconds].every(n => Number.isInteger(n) && n >= 10 && n <= 3600) ||
    !Number.isFinite(latencyMs) ||
    latencyMs <= 0
  )
    throw new Error(
      'Search/soak duration must be 10–3600 seconds; API p95 threshold must be positive.'
    );
  return {
    databaseUrl,
    redisUrl,
    seconds,
    soakSeconds,
    latencyMs,
    output: path.resolve(env.SPRINT4_OUTPUT_DIR || 'test-results/sprint4'),
    secret: randomBytes(32).toString('hex'),
  };
}
function applyEnvironment(config, databaseUrl) {
  Object.assign(process.env, {
    NODE_ENV: 'test',
    DATABASE_URL: databaseUrl,
    REDIS_URL: config.redisUrl,
    JWT_SECRET: config.secret,
    DB_POOL_MAX: '10',
    LOG_LEVEL: 'error',
    CORS_ORIGIN: 'http://127.0.0.1:3016',
    SMTP_HOST: '',
    SMTP_FROM: '',
    SMTP_USER: '',
    SMTP_PASS: '',
    LOCAL_DEMO_ENABLED: 'false',
    PAYMENT_DEMO_ENABLED: 'false',
    INVOICE_API_URL: '',
    INVOICE_API_TOKEN: '',
    FCM_SERVICE_ACCOUNT_JSON: '',
    GOOGLE_APPLICATION_CREDENTIALS: '',
    FIREBASE_SERVICE_ACCOUNT_JSON: '',
    FIREBASE_SERVICE_ACCOUNT_PATH: '',
    FIREBASE_SERVICE_ACCOUNT: '',
  });
}
module.exports = { settings, loopback, applyEnvironment };

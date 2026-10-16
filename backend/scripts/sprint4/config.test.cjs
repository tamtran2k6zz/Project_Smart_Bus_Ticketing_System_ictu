const { test } = require('node:test');
const assert = require('node:assert/strict');
const { settings } = require('./config.cjs');
const { summary } = require('./load.cjs');
test('load runner rejects production, shared database names and unexpected protocols', () => {
  for (const url of [
    'postgresql://user:pass@example.com/smartbus_sprint4_test',
    'postgresql://localhost/production',
    'https://localhost/smartbus_sprint4_test',
  ])
    assert.throws(() => settings({ SPRINT4_DATABASE_URL: url }));
  assert.throws(() => settings({ SPRINT4_REDIS_URL: 'redis://example.com:6379' }));
  assert.throws(() => settings({ SPRINT4_SEARCH_SECONDS: '0' }));
  assert.throws(() => settings({ SPRINT4_SOAK_SECONDS: '3601' }));
});
test('summary preserves HTTP conflicts and computes actual percentiles and failures', () => {
  const result = summary(
    [
      { ms: 10, status: 200, ok: true },
      { ms: 20, status: 409, ok: true },
      { ms: 500, status: 'transport-error', ok: false },
    ],
    1000
  );
  assert.equal(result.requests, 3);
  assert.equal(result.rps, 3);
  assert.equal(result.p95Ms, 500);
  assert.equal(result.errors, 1);
  assert.equal(result.statuses[409], 1);
});

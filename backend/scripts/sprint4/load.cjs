// Native PostgreSQL + Redis only. Each run uses its own disposable, named local database.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { fork, execFileSync } = require('node:child_process');
const { performance } = require('node:perf_hooks');
const { Client } = require('pg');
const { createClient } = require('redis');
const { settings } = require('./config.cjs');
function summary(records, elapsedMs) {
  const times = records.map(r => r.ms).sort((a, b) => a - b),
    statuses = {};
  for (const r of records) statuses[r.status] = (statuses[r.status] || 0) + 1;
  return {
    requests: times.length,
    elapsedMs,
    rps: times.length / (elapsedMs / 1000),
    statuses,
    errors: records.filter(r => !r.ok).length,
    p50Ms: times[Math.ceil(times.length * 0.5) - 1] || 0,
    p95Ms: times[Math.ceil(times.length * 0.95) - 1] || 0,
    p99Ms: times[Math.ceil(times.length * 0.99) - 1] || 0,
    maxMs: times.at(-1) || 0,
  };
}
async function main() {
  const config = settings(),
    name = 'smartbus_sprint4_' + Date.now() + '_' + randomBytes(4).toString('hex');
  const runUrl = new URL(config.databaseUrl);
  runUrl.pathname = '/' + name;
  config.runDatabaseUrl = runUrl.href;
  config.runDir = path.join(config.output, name);
  fs.mkdirSync(config.runDir, { recursive: true });
  const control = new Client({
      connectionString: config.databaseUrl,
      connectionTimeoutMillis: 5000,
    }),
    db = new Client({ connectionString: runUrl.href, connectionTimeoutMillis: 5000 });
  const redis = createClient({
    url: config.redisUrl,
    socket: { connectTimeout: 5000, reconnectStrategy: false },
  });
  redis.on('error', () => {});
  let child,
    created = false,
    dbConnected = false,
    controlConnected = false,
    logFd;
  const result = {
    startedAt: new Date().toISOString(),
    environment: {
      kind: 'local-isolated-native-postgresql',
      node: process.version,
      platform: os.platform(),
      cpus: os.cpus().length,
      ramBytes: os.totalmem(),
      poolMax: 10,
    },
    settings: {
      searchUsers: 200,
      raceUsers: 50,
      searchSeconds: config.seconds,
      soakSeconds: config.soakSeconds,
      apiP95Ms: config.latencyMs,
    },
    phases: {},
    checks: {},
    limitations: [
      'Local measurements with synthetic data; not Staging/production acceptance.',
      '200 closed-loop virtual users, not a guaranteed 200 RPS arrival rate.',
      'Short soak only detects observed errors/trends; it cannot prove absence of memory leaks.',
    ],
  };
  let failure;
  try {
    await control.connect();
    controlConnected = true;
    await redis.connect();
    assert.equal(await redis.ping(), 'PONG');
    await control.query('CREATE DATABASE ' + name);
    created = true;
    await db.connect();
    dbConnected = true;
    await db.query(
      `DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF; IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF; END $$;`
    );
    const migrations = path.resolve(__dirname, '../../../supabase/migrations');
    for (const file of fs
      .readdirSync(migrations)
      .filter(f => f.endsWith('.sql'))
      .sort())
      await db.query(fs.readFileSync(path.join(migrations, file), 'utf8'));
    await require('./schema.cjs')(db, config.runDir);
    result.environment.postgres = (await db.query('SELECT version() AS version')).rows[0].version;
    result.environment.commit = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: path.resolve(__dirname, '../../..'),
      encoding: 'utf8',
      windowsHide: true,
    }).trim();
    result.environment.workingTree = execFileSync('git', ['status', '--porcelain'], {
      cwd: path.resolve(__dirname, '../../..'),
      encoding: 'utf8',
      windowsHide: true,
    }).trim()
      ? 'modified'
      : 'clean';
    logFd = fs.openSync(path.join(config.runDir, 'api.log'), 'a');
    child = fork(path.join(__dirname, 'api.cjs'), [], {
      env: { ...process.env, SPRINT4_CHILD_CONFIG: JSON.stringify(config) },
      stdio: ['ignore', logFd, logFd, 'ipc'],
      windowsHide: true,
    });
    const ready = await new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error('Isolated API startup timed out; inspect api.log.')),
        45000
      );
      child.once('message', message => {
        clearTimeout(timeout);
        resolve(message);
      });
      child.once('exit', code => {
        clearTimeout(timeout);
        reject(new Error('Isolated API exited during startup: ' + code));
      });
      child.once('error', reject);
    });
    assert.equal(ready.type, 'ready');
    const { url, data } = ready;
    result.environment.dataset = { passengers: 50, routes: 1, buses: 1, trips: 1, seats: 40 };
    async function call(endpoint, options = {}) {
      const started = performance.now();
      try {
        const response = await fetch(url + endpoint, {
          ...options,
          signal: AbortSignal.timeout(15000),
        });
        const body = await response.json();
        return { status: response.status, ms: performance.now() - started, ok: response.ok, body };
      } catch {
        return { status: 'transport-error', ms: performance.now() - started, ok: false };
      }
    }
    const health = await call('/api/health');
    assert.equal(health.body.redis.status, 'READY');
    assert.equal(health.body.redis.seatLock, 'redis-and-postgresql');
    for (let i = 0; i < 5; i++) assert.equal((await call('/api/smartbus/v1/trips')).status, 200);
    async function searchPhase(label, users, seconds) {
      console.log(label + ': ' + users + ' virtual users, ' + seconds + ' seconds');
      const records = [],
        started = performance.now(),
        until = started + seconds * 1000;
      await Promise.all(
        Array.from({ length: users }, async () => {
          do {
            const r = await call('/api/smartbus/v1/trips');
            const valid =
              r.status === 200 && Array.isArray(r.body) && r.body.some(t => t.id === data.trip);
            records.push({ status: r.status, ms: r.ms, ok: valid });
          } while (performance.now() < until);
        })
      );
      result.phases[label] = summary(records, performance.now() - started);
      fs.writeFileSync(path.join(config.runDir, label + '-requests.json'), JSON.stringify(records));
    }
    await searchPhase('search', 200, config.seconds);
    // All contenders cross the same start barrier. Check UI (PG lock) and legacy (Redis+PG) separately.
    for (const [label, seat, endpoint, body] of [
      [
        'ui-seat-race',
        'A01',
        '/api/smartbus/v1/holds',
        { tripId: data.trip, seatIds: ['A01'], quantity: 1 },
      ],
      [
        'redis-seat-race',
        'A02',
        '/api/v1/ticketing/bookings',
        { tripId: data.trip, seatNumber: 'A02', paymentMethod: 'QR' },
      ],
    ]) {
      console.log(label + ': 50 distinct passengers compete for ' + seat);
      const started = performance.now();
      const records = await Promise.all(
        data.users.map(user =>
          call(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + user.token },
            body: JSON.stringify(body),
          })
        )
      );
      const expected = label === 'ui-seat-race' ? 200 : 201;
      const winner = records.filter(r => r.status === expected);
      result.phases[label] = summary(
        records.map(r => ({ ...r, ok: r.status === expected || r.status === 409 })),
        performance.now() - started
      );
      const seatRow = (
        await db.query(
          'SELECT status,ticket_id,locked_by_user_id FROM trip_seats WHERE trip_id=$1 AND seat_number=$2',
          [data.trip, seat]
        )
      ).rows[0];
      const holds = Number(
        (
          await db.query(
            "SELECT count(*) FROM ui_holds WHERE trip_id=$1 AND seat_ids ? $2 AND status='active'",
            [data.trip, seat]
          )
        ).rows[0].count
      );
      const tickets = Number(
        (
          await db.query(
            "SELECT count(*) FROM tickets WHERE trip_id=$1 AND seat_number=$2 AND status IN ('RESERVED','BOOKED','CHECKED_IN')",
            [data.trip, seat]
          )
        ).rows[0].count
      );
      const ownerMatches =
        winner.length === 1 &&
        seatRow.locked_by_user_id === data.users[records.findIndex(r => r.status === expected)].id;
      result.checks[label] = {
        passed:
          winner.length === 1 &&
          records.filter(r => r.status === 409).length === 49 &&
          seatRow.status === 'LOCKED' &&
          ownerMatches &&
          (label === 'ui-seat-race' ? holds === 1 : tickets === 1),
        winners: winner.length,
        conflicts: records.filter(r => r.status === 409).length,
        holds,
        tickets,
        ownerMatches,
      };
      if (label === 'redis-seat-race') {
        const key = 'lock:trip:' + data.trip + ':seat:' + seat;
        const value = await redis.get(key);
        result.checks.redisLock = {
          passed:
            !!value &&
            value.startsWith(seatRow.locked_by_user_id + ':') &&
            (await redis.ttl(key)) > 0,
        };
        await redis.del(key); // Only the unique, generated test-trip key.
      }
    }
    await searchPhase('soak', 20, config.soakSeconds);
    result.environment.redisInfo = (await redis.info('clients'))
      .split('\r\n')
      .filter(l => /^connected_clients:|^blocked_clients:/.test(l));
    result.checks.searchNoErrors = { passed: result.phases.search.errors === 0 };
    result.checks.soakNoErrors = { passed: result.phases.soak.errors === 0 };
    result.checks.searchLatency = {
      passed: result.phases.search.p95Ms < config.latencyMs,
      p95Ms: result.phases.search.p95Ms,
      thresholdMs: config.latencyMs,
    };
    result.passed = Object.values(result.checks).every(c => c.passed);
  } catch (error) {
    failure = error;
    result.passed = false;
    result.failure = error.message;
  } finally {
    if (child && child.connected) {
      await new Promise(resolve => {
        const timeout = setTimeout(() => {
          child.kill();
          resolve();
        }, 15000);
        child.once('exit', () => {
          clearTimeout(timeout);
          resolve();
        });
        child.send({ type: 'stop' });
      });
    } else if (child && child.exitCode === null) child.kill();
    if (logFd !== undefined) fs.closeSync(logFd);
    if (dbConnected) await db.end();
    if (created) {
      assert.match(name, /^smartbus_sprint4_\d+_[a-f0-9]{8}$/);
      await control.query('DROP DATABASE ' + name + ' WITH (FORCE)');
    }
    if (controlConnected) await control.end();
    if (redis.isOpen) await redis.quit();
    result.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(config.runDir, 'summary.json'), JSON.stringify(result, null, 2));
    console.log(
      JSON.stringify(
        {
          passed: result.passed,
          phases: result.phases,
          checks: result.checks,
          output: config.runDir,
          failure: result.failure,
        },
        null,
        2
      )
    );
  }
  if (failure || !result.passed) process.exitCode = 1;
}
if (require.main === module)
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
module.exports = { summary };

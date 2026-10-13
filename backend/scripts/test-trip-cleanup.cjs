const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');
const request = require('supertest');
const jwt = require('jsonwebtoken');
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'trip-cleanup-test-secret-at-least-32-characters';
process.env.DATABASE_URL = 'postgresql://test:test@127.0.0.1:1/test';
for (const key of ['REDIS_URL', 'REDIS_HOST', 'REDIS_PORT', 'REDIS_PASSWORD'])
  delete process.env[key];

async function main() {
  const db = new PGlite();
  await db.exec('CREATE ROLE anon; CREATE ROLE authenticated;');
  const dir = path.resolve(__dirname, '../../supabase/migrations');
  for (const name of fs
    .readdirSync(dir)
    .filter(n => n.endsWith('.sql'))
    .sort())
    await db.exec(fs.readFileSync(path.join(dir, name), 'utf8'));
  const pool = require('../dist/config/database').dbPool;
  for (const key of ['REDIS_URL', 'REDIS_HOST', 'REDIS_PORT', 'REDIS_PASSWORD'])
    delete process.env[key];
  pool.query = (sql, args) => db.query(sql, args);
  pool.connect = async () => ({ query: (sql, args) => db.query(sql, args), release() {} });
  const app = require('../dist/app').default;
  const tokens = {};
  for (const role of ['ADMIN', 'MANAGER', 'PASSENGER']) {
    await db.query(
      "INSERT INTO users(id,full_name,email,password_hash,role,role_id) VALUES($1,$2,$3,'unused',$4,(SELECT id FROM roles WHERE name=$4))",
      [role, role, role + '@example.test', role]
    );
    tokens[role] = jwt.sign({ id: role, role, authVersion: 0 }, process.env.JWT_SECRET);
  }
  await db.query(
    "INSERT INTO routes(id,code,name) VALUES('cleanup-route','CLEANUP','Cleanup test')"
  );
  for (const [id, status, days] of [
    ['old', 'SCHEDULED', 8],
    ['recent', 'SCHEDULED', 6],
    ['future', 'SCHEDULED', -1],
    ['cancelled', 'CANCELLED', 8],
    ['completed', 'COMPLETED', 8],
    ['in-transit', 'IN_TRANSIT', 8],
  ])
    await db.query(
      "INSERT INTO trips(id,route_id,departure_time,arrival_time,status) VALUES($1,'cleanup-route',NOW()-$3::int*INTERVAL '1 day',NOW()-$3::int*INTERVAL '1 day'+INTERVAL '1 hour',$2)",
      [id, status, days]
    );
  await db.query(
    "INSERT INTO trips(id,route_id,departure_time,arrival_time,status) VALUES('still-running','cleanup-route',NOW()-INTERVAL '1 hour',NOW()+INTERVAL '1 hour','IN_TRANSIT'),('long-trip','cleanup-route',NOW()-INTERVAL '8 days',NOW()+INTERVAL '1 hour','SCHEDULED')"
  );
  try {
    const prefix = '/api/smartbus/v1/operations/cleanup-old-trips';
    const response = await request(app)
      .post(prefix)
      .set('Authorization', 'Bearer ' + tokens.ADMIN)
      .send({ days: 7 });
    assert.equal(
      response.status,
      200,
      'UI cleanup request must reach the cleanup handler: ' + JSON.stringify(response.body)
    );
    assert.equal(
      response.body.oldTripsCleaned,
      3,
      'Finish recent and running trips after arrival, without waiting seven days'
    );
    assert.equal(
      (await db.query("SELECT status FROM trips WHERE id='old'")).rows[0].status,
      'COMPLETED'
    );
    for (const [id, status] of [
      ['recent', 'COMPLETED'],
      ['future', 'SCHEDULED'],
      ['cancelled', 'CANCELLED'],
      ['completed', 'COMPLETED'],
      ['in-transit', 'COMPLETED'],
      ['still-running', 'IN_TRANSIT'],
      ['long-trip', 'SCHEDULED'],
    ])
      assert.equal(
        (await db.query('SELECT status FROM trips WHERE id=$1', [id])).rows[0].status,
        status
      );
    for (const url of [
      prefix,
      '/api/operations/cleanup-old-trips',
      '/api/v1/operations/cleanup-old-trips',
    ]) {
      const again = await request(app)
        .post(url)
        .set('Authorization', 'Bearer ' + tokens.MANAGER)
        .send({});
      assert.equal(again.status, 200);
      assert.equal(again.body.oldTripsCleaned, 0, 'Repeated cleanup is safe');
      assert.equal((await request(app).post(url).send({ days: 7 })).status, 401);
      assert.equal(
        (
          await request(app)
            .post(url)
            .set('Authorization', 'Bearer ' + tokens.PASSENGER)
            .send({ days: 7 })
        ).status,
        403
      );
    }
    console.log(
      'PASS: UI/legacy cleanup routes, arrival-based completion, active/future/cancelled trip protection, permissions and repeat requests'
    );
  } finally {
    // Allow the asynchronous request audit to finish before shutting down PGlite.
    await new Promise(resolve => setImmediate(resolve));
    await pool.end();
    await db.close();
  }
}
main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

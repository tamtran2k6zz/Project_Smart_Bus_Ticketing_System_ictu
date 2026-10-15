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
  await db.query(
    "INSERT INTO buses(id,plate_number,total_seats,status) VALUES('cleanup-bus','29B-188.22',40,'READY')"
  );
  await db.query(
    "INSERT INTO users(id,full_name,email,password_hash,role,role_id) VALUES('cleanup-driver','Tài xế lịch sử','cleanup-driver@example.test','unused','DRIVER',(SELECT id FROM roles WHERE name='DRIVER'))"
  );
  await db.query(
    "INSERT INTO staff_profiles(id,user_id,name,phone) VALUES('cleanup-staff','cleanup-driver','Tài xế lịch sử','0901112345')"
  );
  for (const [id, status, days] of [
    ['old', 'SCHEDULED', 8],
    ['recent', 'SCHEDULED', 6],
    ['future', 'SCHEDULED', -1],
    ['cancelled', 'CANCELLED', 8],
    ['completed', 'COMPLETED', 8],
    ['recent-completed', 'COMPLETED', 0],
    ['in-transit', 'IN_TRANSIT', 8],
  ])
    await db.query(
      "INSERT INTO trips(id,route_id,departure_time,arrival_time,status) VALUES($1,'cleanup-route',NOW()-$3::int*INTERVAL '1 day',NOW()-$3::int*INTERVAL '1 day'+INTERVAL '1 hour',$2)",
      [id, status, days]
    );
  await db.query(
    "INSERT INTO trips(id,route_id,departure_time,arrival_time,status) VALUES('still-running','cleanup-route',NOW()-INTERVAL '1 hour',NOW()+INTERVAL '1 hour','IN_TRANSIT'),('long-trip','cleanup-route',NOW()-INTERVAL '8 days',NOW()+INTERVAL '1 hour','SCHEDULED')"
  );
  await db.query(
    "UPDATE trips SET bus_id='cleanup-bus',driver_id='cleanup-driver' WHERE id IN ('completed','recent-completed','future','old')"
  );
  await db.query(
    "INSERT INTO tickets(id,ticket_code,trip_id,user_id,status,fare_amount) VALUES('history-ticket','HISTORY-TICKET','completed','PASSENGER','CHECKED_IN',10000)"
  );
  await db.query(
    "INSERT INTO payment_transactions(ticket_id,order_id,payment_method,amount,status,paid_at) VALUES('history-ticket','history-ticket','MOMO',10000,'SUCCESS',NOW())"
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
    const activeTrips = await request(app)
      .get('/api/smartbus/v1/operations/trips')
      .set('Authorization', 'Bearer ' + tokens.ADMIN);
    assert.equal(activeTrips.status, 200);
    assert.equal(
      activeTrips.body.some(t => t.id === 'completed'),
      false,
      'A completed trip must leave the operating list after cleanup'
    );
    assert.equal(
      activeTrips.body.some(t => t.id === 'recent-completed'),
      false,
      'All completed trips are archived without a seven-day threshold'
    );
    const history = await request(app)
      .get('/api/smartbus/v1/operations/trips?archived=true')
      .set('Authorization', 'Bearer ' + tokens.ADMIN);
    assert.equal(history.status, 200);
    assert.equal(
      history.body.filter(t => ['completed', 'recent-completed'].includes(t.id)).length,
      2
    );
    assert.equal(history.body.find(t => t.id === 'completed').vehicleId, 'cleanup-bus');
    const assignments = await request(app)
      .get('/api/smartbus/v1/operations/assignments')
      .set('Authorization', 'Bearer ' + tokens.ADMIN);
    assert.equal(
      assignments.body.some(a => a.tripId === 'completed'),
      false
    );
    const archivedAssignments = await request(app)
      .get('/api/smartbus/v1/operations/assignments?archived=true')
      .set('Authorization', 'Bearer ' + tokens.ADMIN);
    assert.equal(
      archivedAssignments.body.some(a => a.tripId === 'completed' && a.staffId === 'cleanup-staff'),
      true
    );
    assert.equal(
      (
        await db.query(
          "SELECT count(*)::int AS n FROM tickets WHERE id='history-ticket' AND trip_id='completed'"
        )
      ).rows[0].n,
      1
    );
    assert.equal(
      (await db.query("SELECT driver_id FROM trips WHERE id='completed'")).rows[0].driver_id,
      'cleanup-driver'
    );
    assert.equal(
      (
        await db.query(
          "SELECT amount,status FROM payment_transactions WHERE ticket_id='history-ticket'"
        )
      ).rows[0].status,
      'SUCCESS'
    );
    const catalog = await request(app).get('/api/smartbus/v1/catalog');
    assert.ok(
      catalog.body.trips.find(t => t.id === 'completed')?.archivedAt,
      'Passenger ticket details retain the archived journey context'
    );
    const staffTrips = await request(app)
      .get('/api/smartbus/v1/staff/trips')
      .set('Authorization', 'Bearer ' + tokens.ADMIN);
    assert.equal(
      staffTrips.body.some(t => t.id === 'completed'),
      false
    );
    // A completed trip with an old planned arrival must not hold this bus/crew after archival.
    const departure = new Date(Date.now() + 15 * 60000).toISOString();
    const created = await request(app)
      .post('/api/smartbus/v1/operations/trips')
      .set('Authorization', 'Bearer ' + tokens.ADMIN)
      .send({
        routeId: 'cleanup-route',
        vehicleId: 'cleanup-bus',
        departure,
        duration: 15,
        seatMode: true,
        status: 'scheduled',
      });
    assert.equal(created.status, 200, JSON.stringify(created.body));
    const newTripId = created.body.id;
    const assign = await request(app)
      .post('/api/smartbus/v1/operations/assignments')
      .set('Authorization', 'Bearer ' + tokens.ADMIN)
      .send({ tripId: newTripId, vehicleId: 'cleanup-bus', staffId: 'cleanup-staff' });
    assert.equal(assign.status, 200, JSON.stringify(assign.body));
    const conflicting = await request(app)
      .post('/api/smartbus/v1/operations/trips')
      .set('Authorization', 'Bearer ' + tokens.ADMIN)
      .send({
        routeId: 'cleanup-route',
        vehicleId: 'cleanup-bus',
        departure,
        duration: 15,
        seatMode: true,
        status: 'scheduled',
      });
    assert.equal(conflicting.status, 409, 'A real active overlap must still be rejected');
    const legacyTrips = await request(app).get('/api/v1/trips');
    assert.equal(
      legacyTrips.body.data.some(t => t.id === 'completed'),
      false
    );
    assert.equal(
      (await request(app).get('/api/v1/trips?archived=true')).body.data.some(
        t => t.id === 'completed'
      ),
      true
    );
    assert.equal(
      response.body.oldTripsCleaned,
      5,
      'Finish expired trips and archive all completed trips'
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
      ['recent-completed', 'COMPLETED'],
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
      'PASS: archive all completed trips, operating/history lists, preserved tickets/payments/crew, reusable bus, overlap protection, permissions and repeat requests'
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

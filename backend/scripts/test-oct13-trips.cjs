const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');
const request = require('supertest');

process.env.JWT_SECRET = 'test-only-secret-at-least-32-characters-long';
process.env.DATABASE_URL = 'postgresql://test:test@127.0.0.1:1/test';
process.env.NODE_ENV = 'test';
process.env.PAYMENT_DEMO_ENABLED = 'true';
delete process.env.REDIS_URL;
delete process.env.REDIS_HOST;
delete process.env.REDIS_PORT;
delete process.env.REDIS_PASSWORD;

async function main() {
  const db = new PGlite();
  await db.exec('CREATE ROLE anon; CREATE ROLE authenticated;');
  const dir = path.resolve(__dirname, '../../supabase/migrations');
  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort()) {
    await db.exec(fs.readFileSync(path.join(dir, file), 'utf8'));
  }
  const pool = require('../dist/config/database').dbPool;
  let queue = Promise.resolve();
  const acquire = async () => {
    let release;
    const previous = queue;
    queue = new Promise(r => (release = r));
    await previous;
    return release;
  };
  pool.query = async (sql, params) => {
    const release = await acquire();
    try {
      return await db.query(sql, params);
    } finally {
      release();
    }
  };
  pool.connect = async () => {
    const release = await acquire();
    return { query: (s, p) => db.query(s, p), release };
  };

  const app = require('../dist/app').default;

  console.log('Seeding 10 trips departing at 16:00 on October 13, 2026...');

  // Create route, bus, driver
  const routeId = 'route-oct13-1';
  await db.query(`
    INSERT INTO routes (id, code, name, base_price, status)
    VALUES ($1, 'OCT13-HN-DN', 'Hà Nội - Đà Nẵng (13/10)', 250000.00, 'ACTIVE')
    ON CONFLICT (id) DO NOTHING
  `, [routeId]);

  const busId = 'bus-oct13-1';
  await db.query(`
    INSERT INTO buses (id, plate_number, bus_type, total_seats, status)
    VALUES ($1, '29B-888.88', 'SLEEPER', 40, 'READY')
    ON CONFLICT (id) DO NOTHING
  `, [busId]);

  const driverId = 'driver-oct13-1';
  await db.query(`
    INSERT INTO users (id, full_name, email, password_hash, role_id, role, email_verified_at)
    VALUES ($1, 'Tài xế 13/10', 'driver1310@smartbus.test', 'hash', 3, 'DRIVER', NOW())
    ON CONFLICT (id) DO NOTHING
  `, [driverId]);

  const adminId = 'admin-oct13-1';
  await db.query(`
    INSERT INTO users (id, full_name, email, password_hash, role_id, role, email_verified_at)
    VALUES ($1, 'Quản trị viên', 'admin1310@smartbus.test', 'hash', 1, 'ADMIN', NOW())
    ON CONFLICT (id) DO NOTHING
  `, [adminId]);

  const passengerId = 'passenger-oct13-1';
  await db.query(`
    INSERT INTO users (id, full_name, email, password_hash, role_id, role, email_verified_at)
    VALUES ($1, 'Hành khách', 'passenger1310@smartbus.test', 'hash', 4, 'PASSENGER', NOW())
    ON CONFLICT (id) DO NOTHING
  `, [passengerId]);

  const tripIds = [];
  const departureTime = '2026-10-13T16:00:00+07:00';
  const arrivalTime = '2026-10-13T22:00:00+07:00';

  for (let i = 1; i <= 10; i++) {
    const tripId = `trip-oct13-${i}`;
    tripIds.push(tripId);
    await db.query(`
      INSERT INTO trips (id, route_id, bus_id, bus_plate, driver_id, departure_time, arrival_time, base_price, total_seats, status)
      VALUES ($1, $2, $3, '29B-88${i}.88', $4, $5, $6, 250000.00, 40, 'SCHEDULED')
      ON CONFLICT (id) DO NOTHING
    `, [tripId, routeId, busId, driverId, departureTime, arrivalTime]);
  }

  console.log(`Successfully seeded ${tripIds.length} trips departing at 2026-10-13 16:00:00+07:00.`);

  // Verify trips can be queried
  const { rows: trips } = await db.query('SELECT id, departure_time, status FROM trips WHERE route_id=$1', [routeId]);
  assert.equal(trips.length, 10);
  console.log('Verified: All 10 trips exist in database with departure time 2026-10-13 16:00:00+07:00.');

  // Test ticket check-in (soát vé) workflow for one of the trips
  const testTripId = tripIds[0];

  // Generate auth token for admin / driver
  const jwt = require('jsonwebtoken');
  const adminToken = jwt.sign({ id: adminId, role: 'ADMIN', email: 'admin1310@smartbus.test' }, process.env.JWT_SECRET);
  const passengerToken = jwt.sign({ id: passengerId, role: 'PASSENGER', email: 'passenger1310@smartbus.test' }, process.env.JWT_SECRET);

  // Book a seat on the trip with paymentMethod: 'QR'
  const bookingRes = await request(app)
    .post('/api/v1/ticketing/bookings')
    .set('Authorization', 'Bearer ' + passengerToken)
    .send({ tripId: testTripId, seatNumber: 'A01', paymentMethod: 'QR' });

  assert.equal(bookingRes.status, 201);
  const ticketId = bookingRes.body.ticketId;

  // Complete payment demo
  const paymentRes = await request(app)
    .post(`/api/ticketing/bookings/${ticketId}/demo-complete`)
    .set('Authorization', 'Bearer ' + passengerToken)
    .send({});
  assert.equal(paymentRes.status, 200);

  // Get ticket code from db
  const ticketCode = (
    await db.query('SELECT ticket_code FROM tickets WHERE id=$1', [ticketId])
  ).rows[0].ticket_code;

  // Test check-in before adjusting time (should fail with 409 CHECKIN_WINDOW_CLOSED because trip is on 2026-10-13 and now is before departure - 30m)
  const earlyCheckin = await request(app)
    .post('/api/tickets/validate-qr')
    .set('Authorization', 'Bearer ' + adminToken)
    .send({ code: ticketCode, tripId: testTripId, manual: true });
  assert.equal(earlyCheckin.status, 409);
  console.log('Verified: Ticket check-in correctly rejects future trip before check-in window.');

  // Adjust trip departure time to be within the active check-in window (e.g. 10 minutes from now)
  await db.query(
    "UPDATE trips SET departure_time=NOW()+INTERVAL '10 minutes', arrival_time=NOW()+INTERVAL '6 hours' WHERE id=$1",
    [testTripId]
  );

  // Test successful check-in (soát vé)
  const successCheckin = await request(app)
    .post('/api/tickets/validate-qr')
    .set('Authorization', 'Bearer ' + adminToken)
    .send({ code: ticketCode, tripId: testTripId, manual: true });

  assert.equal(successCheckin.status, 200);
  assert.equal(successCheckin.body.success, true);
  assert.equal(successCheckin.body.isAlreadyCheckedIn, false);
  console.log('Verified: Ticket check-in (soát vé) succeeded successfully within check-in window.');

  // Test rescan (already checked in)
  const rescan = await request(app)
    .post('/api/tickets/validate-qr')
    .set('Authorization', 'Bearer ' + adminToken)
    .send({ code: ticketCode, tripId: testTripId, manual: true });

  assert.equal(rescan.status, 200);
  assert.equal(rescan.body.isAlreadyCheckedIn, true);
  console.log('Verified: Rescanning checked-in ticket correctly returns isAlreadyCheckedIn: true.');

  console.log('All tests for October 13, 2026 trips and ticket check-in passed successfully!');
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});

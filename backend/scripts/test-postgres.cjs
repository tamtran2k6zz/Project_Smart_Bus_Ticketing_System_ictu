const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHmac } = require('node:crypto');
const { createServer } = require('node:http');
const { PGlite } = require('@electric-sql/pglite');
const request = require('supertest');
process.env.JWT_SECRET = 'test-only-secret-at-least-32-characters-long';
process.env.DATABASE_URL = 'postgresql://test:test@127.0.0.1:1/test';
process.env.MOMO_PARTNER_CODE = 'test-partner';
process.env.MOMO_ACCESS_KEY = 'test-access-key';
process.env.MOMO_SECRET_KEY = 'test-secret-key';
process.env.PAYMENT_CRON_SECRET = 'test-cron-secret';
process.env.VNPAY_TMN_CODE = 'test-tmn';
process.env.VNPAY_HASH_SECRET = 'test-vnpay-secret';
process.env.NODE_ENV = 'test';
process.env.ZALOPAY_APP_ID = '9999';
process.env.ZALOPAY_KEY1 = 'test-zalo-key1';
process.env.ZALOPAY_KEY2 = 'test-zalo-key2';
process.env.PAYMENT_DEMO_ENABLED = 'true';
// The suite must not depend on a running Redis. Seat locking falls back to the
// PostgreSQL row lock, which is the concurrency guard under test.
delete process.env.REDIS_URL;
delete process.env.REDIS_HOST;
delete process.env.REDIS_PORT;
delete process.env.REDIS_PASSWORD;

async function main() {
  const db = new PGlite();
  await db.exec('CREATE ROLE anon; CREATE ROLE authenticated;');
  const dir = path.resolve(__dirname, '../../supabase/migrations');
  for (const file of fs
    .readdirSync(dir)
    .filter(f => f.endsWith('.sql'))
    .sort()) {
    await db.exec(fs.readFileSync(path.join(dir, file), 'utf8'));
  }
  const pool = require('../dist/config/database').dbPool;
  // config/database loads dotenv, which can repopulate REDIS_* from backend/.env.
  // Clear them here, before the app (and config/redis) is required, so the
  // suite never needs a live Redis: seat locking then uses the PostgreSQL
  // row lock, which is the concurrency guard under test.
  delete process.env.REDIS_URL;
  delete process.env.REDIS_HOST;
  delete process.env.REDIS_PORT;
  delete process.env.REDIS_PASSWORD;
  const refundRequests = [];
  let refundHandler;
  delete process.env.SMTP_HOST;
  const gatewayServer = createServer((req, res) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', () => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      if (req.url === '/refund') {
        refundRequests.push(JSON.parse(body));
        if (refundHandler) {
          const handler = refundHandler;
          refundHandler = undefined;
          handler(res);
          return;
        }
      }
      res.end(
        req.url === '/zalo-create'
          ? JSON.stringify({ return_code: 1, order_url: 'https://sandbox.example.test/zalo' })
          : req.url === '/refund'
            ? JSON.stringify({ resultCode: 0, message: 'Refund accepted' })
            : JSON.stringify({ resultCode: 0, payUrl: 'https://sandbox.example.test/pay' })
      );
    });
  });
  await new Promise(resolve => gatewayServer.listen(0, '127.0.0.1', resolve));
  const gatewayAddress = gatewayServer.address();
  process.env.ZALOPAY_CREATE_URL = 'http://127.0.0.1:' + gatewayAddress.port + '/zalo-create';
  process.env.MOMO_CREATE_URL = `http://127.0.0.1:${gatewayAddress.port}/create`;
  process.env.MOMO_REFUND_URL = `http://127.0.0.1:${gatewayAddress.port}/refund`;
  process.env.MOMO_IPN_URL = 'https://callbacks.example.test/api/v1/ticketing/payments/momo/ipn';
  process.env.PAYMENT_RESULT_URL = 'http://localhost:3000/passenger/booking';
  // PGlite is single-session. Serialize complete transactions, not their statements.
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
  let checks = 0;
  const call = async (method, url, body, token, status = 200) => {
    // Existing paid-seat fixtures now explicitly reserve QR and confirm using the
    // opt-in LOCAL demo endpoint. Production rejection is tested separately.
    const paidFixture =
      method === 'post' &&
      /^\/api\/(v1\/)?ticketing\/bookings$/.test(url) &&
      body?.paymentMethod === undefined;
    if (paidFixture) body = { ...body, paymentMethod: 'QR' };
    if (url.endsWith('/verify')) body = { ...body, manual: true };
    let r = request(app)[method](url);
    if (token) r = r.set('Authorization', 'Bearer ' + token);
    if (body) r = r.send(body);
    const response = await r;
    assert.equal(response.status, status, JSON.stringify(response.body));
    checks++;
    if (paidFixture && response.status === 201) {
      const id = response.body.ticketId;
      const paid = await request(app)
        .post('/api/ticketing/bookings/' + id + '/demo-complete')
        .set('Authorization', 'Bearer ' + token)
        .send({});
      assert.equal(paid.status, 200, JSON.stringify(paid.body));
      response.body.qrCode =
        'SMARTBUS-QR-' +
        (await db.query('SELECT ticket_code FROM tickets WHERE id=$1', [id])).rows[0].ticket_code;
    }
    return response.body;
  };
  const momoCallback = (orderId, amount, transId) => {
    const payload = {
      amount,
      extraData: '',
      message: 'Successful.',
      orderId,
      orderInfo: `Thanh toan ve xe ${orderId}`,
      orderType: 'momo_wallet',
      partnerCode: process.env.MOMO_PARTNER_CODE,
      payType: 'qr',
      requestId: 'request-' + orderId,
      responseTime: Date.now(),
      resultCode: 0,
      transId,
    };
    const fields = [
      ['accessKey', process.env.MOMO_ACCESS_KEY],
      ['amount', payload.amount],
      ['extraData', payload.extraData],
      ['message', payload.message],
      ['orderId', payload.orderId],
      ['orderInfo', payload.orderInfo],
      ['orderType', payload.orderType],
      ['partnerCode', payload.partnerCode],
      ['payType', payload.payType],
      ['requestId', payload.requestId],
      ['responseTime', payload.responseTime],
      ['resultCode', payload.resultCode],
      ['transId', payload.transId],
    ];
    payload.signature = createHmac('sha256', process.env.MOMO_SECRET_KEY)
      .update(fields.map(([key, value]) => `${key}=${String(value ?? '')}`).join('&'))
      .digest('hex');
    return payload;
  };
  try {
    await call('get', '/api/health');
    const register = async (email, role) =>
      call(
        'post',
        '/api/auth/register',
        {
          full_name: 'Kiểm thử',
          email,
          password: 'TestPassword@123',
          role,
          ...(email === 'passenger@example.test' ? { phone_number: '0891234567' } : {}),
        },
        null,
        201
      );
    const first = await register('passenger@example.test', 'ADMIN');
    assert.equal(first.data.user.role, 'PASSENGER');
    const passenger = first.data.tokens.accessToken;
    const second = await register('other@example.test');
    const other = second.data.tokens.accessToken;
    // Paid-seat fixtures are already verified; verification itself is exercised separately.
    await db.query('UPDATE users SET email_verified_at=NOW() WHERE id=ANY($1::text[])', [
      [first.data.user.id, second.data.user.id],
    ]);
    await db.query("UPDATE users SET role='ADMIN',role_id=1 WHERE id=$1", [first.data.user.id]);
    const login = await call('post', '/api/auth/login', {
      email: 'passenger@example.test',
      password: 'TestPassword@123',
    });
    const admin = login.data.tokens.accessToken;
    for (const identifier of ['0891234567', '+84891234567']) {
      const phoneLogin = await call('post', '/api/auth/login', {
        identifier,
        password: 'TestPassword@123',
      });
      assert.equal(phoneLogin.data.user.id, first.data.user.id);
    }
    await call(
      'post',
      '/api/auth/login',
      {
        identifier: '0891234567',
        password: 'incorrect',
      },
      null,
      401
    );
    await call(
      'post',
      '/api/auth/login',
      {
        identifier: { phone: '0891234567' },
        password: 'TestPassword@123',
      },
      null,
      400
    );
    await call('get', '/api/auth/me', null, admin);
    await call(
      'post',
      '/api/auth/login',
      { email: 'passenger@example.test', password: 'incorrect' },
      null,
      401
    );
    await call('get', '/api/users', null, null, 401);
    await call('get', '/api/users', null, other, 403);
    await call('get', '/api/users', null, admin);
    const route = (
      await call(
        'post',
        '/api/routes',
        { code: 'TEST', name: 'Tuyến thử', base_price: 12000 },
        admin,
        201
      )
    ).data.id;
    const stops = [];
    for (let n = 1; n <= 2; n++) {
      const stop = (
        await call(
          'post',
          '/api/stops',
          {
            code: 'STOP' + n,
            name: 'Trạm ' + n,
            address: 'ICTU',
            latitude: 21.58,
            longitude: 105.79 + n / 100,
          },
          admin,
          201
        )
      ).data.id;
      stops.push(stop);
      await call(
        'post',
        `/api/routes/${route}/stops`,
        { stop_id: stop, stop_order: n, estimated_minutes: n * 15 },
        admin
      );
    }
    await call(
      'post',
      `/api/routes/${route}/stops`,
      { stop_id: stops[1], stop_order: 2, estimated_minutes: 30 },
      admin
    );
    await call('put', `/api/stops/${stops[0]}`, { name: 'Trạm cập nhật', status: 'ACTIVE' }, admin);
    await call(
      'patch',
      `/api/routes/${route}`,
      { name: 'Tuyến cập nhật', base_price: 15000 },
      admin
    );
    await call('get', '/api/routes');
    await call('get', '/api/stops');
    const routeWithStops = (
      await call(
        'post',
        '/api/routes',
        {
          code: 'WITH_STOPS',
          name: 'Tuyến có trạm tạo cùng lúc',
          stations: [{ name: 'Trạm tự tạo 1', address: 'Địa chỉ 1', order: 1 }],
        },
        admin,
        201
      )
    ).data.id;
    let routeList = await call('get', '/api/routes');
    let createdRoute = routeList.data.find(item => item.id === routeWithStops);
    assert.equal(createdRoute.stops.length, 1);
    assert.ok(createdRoute.stops.every(stop => stop.stopId && stop.code.startsWith('ST-')));
    const firstSavedStop = createdRoute.stops[0];
    await call(
      'patch',
      `/api/routes/${routeWithStops}`,
      {
        stations: [
          {
            id: firstSavedStop.stopId,
            name: firstSavedStop.name,
            address: firstSavedStop.address,
            order: 2,
          },
          { name: 'Trạm tự tạo 2', address: 'Địa chỉ 2', order: 1 },
        ],
      },
      admin
    );
    routeList = await call('get', '/api/routes');
    createdRoute = routeList.data.find(item => item.id === routeWithStops);
    assert.equal(createdRoute.stops.length, 2);
    assert.equal(createdRoute.stops[0].name, 'Trạm tự tạo 2');
    assert.equal(createdRoute.stops[1].stopId, firstSavedStop.stopId);
    assert.equal(createdRoute.stops[0].stopOrder, 1);
    const trip = (
      await call(
        'post',
        '/api/trips',
        {
          route_id: route,
          bus_plate: '20A-12345',
          departure_time: '2099-01-01T08:00:00+07:00',
          arrival_time: '2099-01-01T09:00:00+07:00',
          base_price: 15000,
        },
        admin,
        201
      )
    ).data.id;
    for (const suffix of [
      '',
      `?route_id=${route}`,
      '?date=2099-01-01',
      `?route_id=${route}&date=2099-01-01`,
    ])
      assert.equal((await call('get', '/api/trips' + suffix)).data.length, 1);
    const search = `/api/trips/search?origin_stop_id=${stops[0]}&destination_stop_id=${stops[1]}`;
    assert.equal((await call('get', search)).data.length, 1);
    assert.equal((await call('get', search + '&departure_date=2099-01-01')).data.length, 1);
    const reverseSearch = `/api/trips/search?origin_stop_id=${stops[1]}&destination_stop_id=${stops[0]}`;
    assert.equal(
      (await call('get', reverseSearch)).data.length,
      0,
      'Reverse journeys must not be sold'
    );
    assert.equal((await call('get', '/api/trips?bookable=true')).data.length, 1);
    const pastTrip = (
      await call(
        'post',
        '/api/trips',
        {
          route_id: route,
          bus_plate: '20A-54321',
          departure_time: '2000-01-01T08:00:00+07:00',
          arrival_time: '2000-01-01T09:00:00+07:00',
          base_price: 15000,
        },
        admin,
        201
      )
    ).data.id;
    assert.equal((await call('get', '/api/trips?bookable=true')).data.length, 1);
    assert.equal((await call('get', search + '&departure_date=2000-01-01')).data.length, 0);
    await call(
      'post',
      '/api/ticketing/bookings',
      { tripId: pastTrip, seatNumber: 'A01', paymentMethod: 'QR' },
      passenger,
      409
    );
    await db.query("UPDATE routes SET status='INACTIVE' WHERE id=$1", [route]);
    await call(
      'post',
      '/api/ticketing/bookings',
      { tripId: trip, seatNumber: 'A39', paymentMethod: 'QR' },
      passenger,
      409
    );
    await db.query("UPDATE routes SET status='ACTIVE' WHERE id=$1", [route]);
    assert.equal((await call('get', `/api/trips/${trip}/seats`)).data.totalSeats, 40);
    await call('get', '/api/seats');
    const [{ bus_id }] = (await db.query('SELECT bus_id FROM trips WHERE id=$1', [trip])).rows;
    await call('get', '/api/seats/bus/' + bus_id);
    await call('post', `/api/trips/${trip}/seats/lock`, { seatNumber: 'A01' }, null, 401);
    await call('post', `/api/trips/${trip}/seats/lock`, { seatNumber: 'A01' }, passenger);
    await call('post', `/api/trips/${trip}/seats/unlock`, { seatNumber: 'A01' }, other, 409);
    await call('post', '/api/ticketing/bookings', { tripId: trip, seatNumber: 'A01' }, other, 409);
    const booked = await call(
      'post',
      '/api/ticketing/bookings',
      { tripId: trip, seatNumber: 'A01', userId: second.data.user.id, paymentMethod: 'MOMO' },
      passenger,
      201
    );
    await call(
      'post',
      '/api/v1/ticketing/payments/momo/ipn',
      momoCallback(booked.ticketId, 15000, 11001)
    );
    const [{ ticket_code: bookedTicketCode }] = (
      await db.query('SELECT ticket_code FROM tickets WHERE id=$1', [booked.ticketId])
    ).rows;
    booked.qrCode = bookedTicketCode;
    await call('get', `/api/v1/tickets/${encodeURIComponent(bookedTicketCode)}`, null, null, 401);
    const ticketDetails = await call(
      'get',
      `/api/v1/tickets/${encodeURIComponent(bookedTicketCode)}`,
      null,
      passenger
    );
    assert.equal(ticketDetails.ticket_code, bookedTicketCode);
    assert.equal(ticketDetails.seat_code, 'A01');
    assert.equal(ticketDetails.route_name, 'Tuyến cập nhật');
    assert.match(ticketDetails.qr_code_base64, /^data:image\/png;base64,/);
    await call('get', `/api/v1/tickets/${encodeURIComponent(bookedTicketCode)}`, null, other, 403);
    assert.equal(
      (await db.query('SELECT user_id FROM tickets WHERE id=$1', [booked.ticketId])).rows[0]
        .user_id,
      first.data.user.id
    );
    await call(
      'post',
      '/api/ticketing/bookings',
      { tripId: trip, seatNumber: 'A01' },
      passenger,
      409
    );
    await db.query(
      "UPDATE trips SET departure_time=NOW()+INTERVAL '10 minutes',arrival_time=NOW()+INTERVAL '70 minutes' WHERE id=$1",
      [trip]
    );
    assert.equal(
      (await call('post', '/api/ticketing/verify', { code: booked.qrCode }, admin))
        .isAlreadyCheckedIn,
      false
    );
    assert.equal(
      (await call('post', '/api/ticketing/verify', { code: booked.qrCode }, admin))
        .isAlreadyCheckedIn,
      true
    );
    await call('post', '/api/ticketing/verify', { code: booked.qrCode }, other, 403);
    // Provider retries after check-in must acknowledge success, never refund a used ticket.
    const refundsBeforeRescan = refundRequests.length;
    await call(
      'post',
      '/api/v1/ticketing/payments/momo/ipn',
      momoCallback(booked.ticketId, 15000, 11001)
    );
    const usedPayment = await call(
      'get',
      `/api/v1/ticketing/payments/${booked.ticketId}`,
      null,
      passenger
    );
    assert.equal(usedPayment.data.paymentStatus, 'SUCCESS');
    assert.equal(usedPayment.data.ticket.status, 'CHECKED_IN');
    assert.equal(refundRequests.length, refundsBeforeRescan);
    await call('post', `/api/v1/ticketing/tickets/${booked.ticketId}/cancel`, {}, passenger, 400);
    // Require an explicit payment method; a QR reservation remains unpaid.
    const missingMethod = await request(app)
      .post('/api/ticketing/bookings')
      .set('Authorization', 'Bearer ' + passenger)
      .send({ tripId: trip, seatNumber: 'A09' });
    assert.equal(missingMethod.status, 400);
    const pending = await call(
      'post',
      '/api/ticketing/bookings',
      { tripId: trip, seatNumber: 'A09', paymentMethod: 'QR' },
      passenger,
      201
    );
    assert.equal(pending.status, 'RESERVED');
    assert.equal(pending.data.payment.status, 'PENDING');
    const pendingDetails = await call(
      'get',
      `/api/v1/tickets/${pending.ticketCode}`,
      null,
      passenger
    );
    assert.equal(pendingDetails.qr_code_base64, null);
    await call(
      'post',
      '/api/tickets/validate-qr',
      { code: pending.ticketCode, manual: true },
      admin,
      409
    );
    await call('post', `/api/v1/ticketing/tickets/${pending.ticketId}/cancel`, {}, passenger);
    const pendingCancelled = await call(
      'get',
      `/api/v1/ticketing/payments/${pending.ticketId}`,
      null,
      passenger
    );
    assert.equal(pendingCancelled.data.ticket.status, 'CANCELLED');
    assert.equal(pendingCancelled.data.paymentStatus, 'FAILED');
    assert.equal(
      (await call('get', `/api/trips/${trip}/seats`)).data.seats.find(s => s.seatNumber === 'A09')
        .isAvailable,
      true
    );
    await db.query(
      "UPDATE trips SET departure_time='2099-01-01T01:00:00Z',arrival_time='2099-01-01T02:00:00Z' WHERE id=$1",
      [trip]
    );
    const qrReservation = await call(
      'post',
      '/api/ticketing/bookings',
      { tripId: trip, seatNumber: 'A06', paymentMethod: 'QR' },
      passenger,
      201
    );
    assert.equal(qrReservation.data.payment.method, 'QR');
    assert.equal(qrReservation.data.payment.status, 'PENDING');
    assert.equal(qrReservation.data.payment.paymentUrl, undefined);
    assert.equal(
      (
        await db.query(
          'SELECT payment_method,amount,status FROM payment_transactions WHERE order_id=$1',
          [qrReservation.ticketId]
        )
      ).rows[0].payment_method,
      'QR'
    );
    assert.equal(
      (
        await db.query('SELECT amount,status FROM payment_transactions WHERE order_id=$1', [
          qrReservation.ticketId,
        ])
      ).rows[0].amount,
      '15000.00'
    );
    assert.equal((await call('get', '/api/trips?bookable=true')).data[0].availableSeats, 38);
    await db.query(
      "UPDATE tickets SET reservation_expires_at=NOW()-INTERVAL '1 minute' WHERE id=$1",
      [qrReservation.ticketId]
    );
    await call('get', `/api/ticketing/trips/${trip}/seats`, null);
    assert.equal(
      (await db.query('SELECT status FROM tickets WHERE id=$1', [qrReservation.ticketId])).rows[0]
        .status,
      'CANCELLED'
    );
    assert.equal(
      (
        await db.query('SELECT status FROM payment_transactions WHERE order_id=$1', [
          qrReservation.ticketId,
        ])
      ).rows[0].status,
      'FAILED'
    );
    const paidReservation = await call(
      'post',
      '/api/ticketing/bookings',
      { tripId: trip, seatNumber: 'A04', paymentMethod: 'MOMO' },
      passenger,
      201
    );
    assert.equal(paidReservation.data.payment.paymentUrl, 'https://sandbox.example.test/pay');
    await call(
      'post',
      '/api/v1/ticketing/payments/momo/ipn',
      momoCallback(paidReservation.ticketId, 15000, 10001),
      null,
      200
    );
    const paidStatus = await call(
      'get',
      `/api/v1/ticketing/payments/${paidReservation.ticketId}`,
      null,
      passenger
    );
    assert.equal(paidStatus.data.paymentStatus, 'SUCCESS');
    assert.equal(paidStatus.data.ticket.status, 'BOOKED');
    // Scan while the external refund is deliberately paused. Cancellation must
    // already be durable, without keeping a database transaction open.
    let releaseRefund;
    let startedRefund;
    const refundStarted = new Promise(resolve => {
      startedRefund = resolve;
    });
    refundHandler = res => {
      releaseRefund = () => res.end(JSON.stringify({ resultCode: 0 }));
      startedRefund();
    };
    const cancelResponse = request(app)
      .post(`/api/v1/ticketing/tickets/${paidReservation.ticketId}/cancel`)
      .set('Authorization', 'Bearer ' + passenger)
      .send({})
      .then(response => response);
    try {
      await Promise.race([
        refundStarted,
        new Promise((_, reject) => {
          const timeout = setTimeout(() => reject(new Error('Refund did not start')), 5000);
          timeout.unref();
        }),
      ]);
      await call(
        'post',
        '/api/tickets/validate-qr',
        { code: paidReservation.ticketCode, manual: true },
        admin,
        409
      );
    } finally {
      if (releaseRefund) releaseRefund();
    }
    const cancelledResponse = await cancelResponse;
    assert.equal(cancelledResponse.status, 200);
    checks++;
    const cancelled = cancelledResponse.body;
    assert.equal(cancelled.success, true);
    assert.equal(
      (
        await db.query('SELECT status FROM payment_transactions WHERE order_id=$1', [
          paidReservation.ticketId,
        ])
      ).rows[0].status,
      'REFUNDED'
    );
    // A failed provider call keeps the cancellation durable and retries with
    // the same refund id. A completed retry must not issue another refund.
    const retryReservation = await call(
      'post',
      '/api/ticketing/bookings',
      { tripId: trip, seatNumber: 'A08', paymentMethod: 'MOMO' },
      passenger,
      201
    );
    await call(
      'post',
      '/api/v1/ticketing/payments/momo/ipn',
      momoCallback(retryReservation.ticketId, 15000, 12001)
    );
    refundHandler = res => res.end(JSON.stringify({ resultCode: 99 }));
    const failedRefund = await call(
      'post',
      `/api/v1/ticketing/tickets/${retryReservation.ticketId}/cancel`,
      {},
      passenger,
      503
    );
    assert.equal(failedRefund.refundPending, true);
    assert.equal(failedRefund.ticketStatus, 'CANCELLED');
    const refundKey = refundRequests.at(-1).requestId;
    assert.equal(
      (
        await db.query('SELECT status FROM refund_jobs WHERE ticket_id=$1', [
          retryReservation.ticketId,
        ])
      ).rows[0].status,
      'pending'
    );
    const { processRefundJobs } = require('../dist/services/refund-queue.service');
    assert.equal(
      await processRefundJobs(1, retryReservation.ticketId),
      1,
      'durable worker retries the failed provider call'
    );
    assert.equal(
      (
        await db.query('SELECT status FROM refund_jobs WHERE ticket_id=$1', [
          retryReservation.ticketId,
        ])
      ).rows[0].status,
      'done'
    );
    await call(
      'post',
      '/api/tickets/validate-qr',
      { code: retryReservation.ticketCode, manual: true },
      admin,
      409
    );
    await call(
      'post',
      `/api/v1/ticketing/tickets/${retryReservation.ticketId}/cancel`,
      {},
      passenger
    );
    assert.equal(refundRequests.at(-1).requestId, refundKey);
    const refundsAfterRetry = refundRequests.length;
    await call(
      'post',
      `/api/v1/ticketing/tickets/${retryReservation.ticketId}/cancel`,
      {},
      passenger
    );
    assert.equal(refundRequests.length, refundsAfterRetry);
    // Run the notification service against real migration columns, not a SQL mock.
    const { notifyApproachingPassengers } = require('../dist/services/notification.service');
    await notifyApproachingPassengers(trip, { latitude: 21.58, longitude: 105.8 });
    const approaching = await call('get', '/api/notifications', null, passenger);
    assert.ok(approaching.items.some(n => n.type === 'BUS_APPROACHING'));

    const vnpayReservation = await call(
      'post',
      '/api/v1/ticketing/bookings',
      { tripId: trip, seatNumber: 'A07', paymentMethod: 'VNPAY' },
      passenger,
      201
    );
    const vnpayFields = {
      vnp_Amount: '1500000',
      vnp_ResponseCode: '00',
      vnp_TmnCode: process.env.VNPAY_TMN_CODE,
      vnp_TransactionNo: 'vn-tx-10003',
      vnp_TransactionStatus: '00',
      vnp_TxnRef: vnpayReservation.ticketId,
    };
    const vnpayQuery = new URLSearchParams(
      Object.keys(vnpayFields)
        .sort()
        .map(key => [key, vnpayFields[key]])
    ).toString();
    const vnpayPayload = {
      ...vnpayFields,
      vnp_SecureHashType: 'HMACSHA512',
      vnp_SecureHash: createHmac('sha512', process.env.VNPAY_HASH_SECRET)
        .update(vnpayQuery)
        .digest('hex'),
    };
    const tamperedReturn = await request(app)
      .get('/api/v1/ticketing/payments/vnpay/return')
      .query({ ...vnpayPayload, vnp_Amount: '1', path: 'v1/ticketing/payments/vnpay/return' });
    assert.equal(tamperedReturn.status, 302);
    assert.equal(
      new URL(tamperedReturn.headers.location).searchParams.get('paymentResult'),
      'unverified'
    );
    assert.equal(
      (
        await db.query('SELECT status FROM payment_transactions WHERE order_id=$1', [
          vnpayReservation.ticketId,
        ])
      ).rows[0].status,
      'PENDING'
    );
    // On-time verified return confirms a reservation inside the ten-minute window.
    // Expired reservations are covered separately and must be refunded.
    await db.query(
      "UPDATE tickets SET reservation_expires_at=NOW()+INTERVAL '1 minute' WHERE id=$1",
      [vnpayReservation.ticketId]
    );
    const vnpayReturn = await request(app)
      .get('/api/v1/ticketing/payments/vnpay/return')
      .query({ ...vnpayPayload, path: 'v1/ticketing/payments/vnpay/return' });
    assert.equal(vnpayReturn.status, 302);
    assert.equal(
      new URL(vnpayReturn.headers.location).searchParams.get('paymentResult'),
      'success'
    );
    assert.equal(
      (await db.query('SELECT status FROM tickets WHERE id=$1', [vnpayReservation.ticketId]))
        .rows[0].status,
      'BOOKED'
    );
    const bookedBeforeDuplicate = (
      await db.query('SELECT booked_seats FROM trips WHERE id=$1', [trip])
    ).rows[0].booked_seats;
    const vnpayFormResponse = await request(app)
      .post('/api/v1/ticketing/payments/vnpay/ipn')
      .query({ path: 'v1/ticketing/payments/vnpay/ipn' })
      .type('form')
      .send(vnpayPayload);
    assert.equal(vnpayFormResponse.status, 200, JSON.stringify(vnpayFormResponse.body));
    assert.equal(vnpayFormResponse.body.RspCode, '00');
    assert.equal(
      (await db.query('SELECT booked_seats FROM trips WHERE id=$1', [trip])).rows[0].booked_seats,
      bookedBeforeDuplicate
    );
    assert.equal(
      (
        await db.query('SELECT status FROM payment_transactions WHERE order_id=$1', [
          vnpayReservation.ticketId,
        ])
      ).rows[0].status,
      'SUCCESS'
    );
    checks++;

    const expiredReservation = await call(
      'post',
      '/api/v1/ticketing/bookings',
      { tripId: trip, seatNumber: 'A05', paymentMethod: 'MOMO' },
      passenger,
      201
    );
    await db.query(
      "UPDATE tickets SET reservation_expires_at=NOW()-INTERVAL '1 minute' WHERE id=$1",
      [expiredReservation.ticketId]
    );
    const cleanup = await call(
      'post',
      '/api/v1/ticketing/release-expired',
      null,
      process.env.PAYMENT_CRON_SECRET
    );
    assert.equal(cleanup.affectedRows, 1);
    assert.equal(
      (await db.query('SELECT status FROM tickets WHERE id=$1', [expiredReservation.ticketId]))
        .rows[0].status,
      'CANCELLED'
    );
    await call(
      'post',
      '/api/v1/ticketing/payments/momo/ipn',
      momoCallback(expiredReservation.ticketId, 15000, 10002),
      null,
      200
    );
    assert.equal(
      (
        await db.query('SELECT status FROM payment_transactions WHERE order_id=$1', [
          expiredReservation.ticketId,
        ])
      ).rows[0].status,
      'REFUNDED'
    );
    const cancelledPending = await call(
      'post',
      '/api/v1/ticketing/bookings',
      { tripId: trip, seatNumber: 'A09', paymentMethod: 'MOMO' },
      passenger,
      201
    );
    await call(
      'post',
      `/api/v1/ticketing/tickets/${cancelledPending.ticketId}/cancel`,
      {},
      passenger
    );
    const refundsBeforeLateCallback = refundRequests.length;
    await call(
      'post',
      '/api/v1/ticketing/payments/momo/ipn',
      momoCallback(cancelledPending.ticketId, 15000, 14001)
    );
    const lateCancelledStatus = await call(
      'get',
      `/api/v1/ticketing/payments/${cancelledPending.ticketId}`,
      null,
      passenger
    );
    assert.equal(lateCancelledStatus.data.ticket.status, 'CANCELLED');
    assert.equal(lateCancelledStatus.data.paymentStatus, 'REFUNDED');
    assert.equal(refundRequests.length, refundsBeforeLateCallback + 1);
    await call(
      'post',
      '/api/v1/ticketing/payments/momo/ipn',
      momoCallback(cancelledPending.ticketId, 15000, 14001)
    );
    assert.equal(refundRequests.length, refundsBeforeLateCallback + 1);
    await call(
      'post',
      '/api/tickets/validate-qr',
      { code: cancelledPending.ticketCode, manual: true },
      admin,
      409
    );
    const originalSchedule = (
      await db.query('SELECT departure_time FROM trips WHERE id=$1', [trip])
    ).rows[0];
    try {
      await db.query("UPDATE trips SET departure_time=NOW()+INTERVAL '20 minutes' WHERE id=$1", [
        trip,
      ]);
      const refundsBeforeCutoff = refundRequests.length;
      await call(
        'post',
        `/api/v1/ticketing/tickets/${vnpayReservation.ticketId}/cancel`,
        {},
        passenger,
        400
      );
      assert.equal(refundRequests.length, refundsBeforeCutoff);
      const unchanged = await call(
        'get',
        `/api/v1/ticketing/payments/${vnpayReservation.ticketId}`,
        null,
        passenger
      );
      assert.equal(unchanged.data.ticket.status, 'BOOKED');
      assert.equal(unchanged.data.paymentStatus, 'SUCCESS');
    } finally {
      await db.query('UPDATE trips SET departure_time=$1 WHERE id=$2', [
        originalSchedule.departure_time,
        trip,
      ]);
    }
    await call('post', `/api/trips/${trip}/seats/lock`, { seatNumber: 'A02' }, passenger);
    await db.query(
      "UPDATE trip_seats SET lock_expires_at=NOW()-INTERVAL '1 minute' WHERE trip_id=$1 AND seat_number='A02'",
      [trip]
    );
    const secondBooked = await call(
      'post',
      '/api/ticketing/bookings',
      { tripId: trip, seatNumber: 'A02', paymentMethod: 'MOMO' },
      other,
      201
    );
    await call(
      'post',
      '/api/v1/ticketing/payments/momo/ipn',
      momoCallback(secondBooked.ticketId, 15000, 13001)
    );
    const competing = await Promise.all(
      [passenger, other].map(token =>
        request(app)
          .post('/api/ticketing/bookings')
          .set('Authorization', 'Bearer ' + token)
          .send({ tripId: trip, seatNumber: 'A03', paymentMethod: 'MOMO' })
      )
    );
    assert.deepEqual(competing.map(r => r.status).sort(), [201, 409]);
    await call(
      'post',
      '/api/v1/ticketing/payments/momo/ipn',
      momoCallback(competing.find(r => r.status === 201).body.ticketId, 15000, 13002)
    );
    checks++;
    await assert.rejects(
      db.query(
        "INSERT INTO tickets(id,trip_id,seat_number,status) VALUES ('duplicate',$1,'A03','BOOKED')",
        [trip]
      ),
      e => e.code === '23505'
    );
    checks++;
    await call(
      'post',
      '/api/operations/incidents',
      { tripId: trip, description: 'Traffic' },
      admin,
      201
    );
    await call('get', '/api/operations/incidents', null, admin);
    assert.equal((await call('get', '/api/ticketing/completed-trips', null, other)).data.length, 0);
    await call(
      'post',
      '/api/operations/feedbacks',
      { tripId: trip, content: 'Chưa hoàn thành', ratingStars: 5 },
      other,
      403
    );
    await db.query(
      "UPDATE trips SET departure_time=NOW()-INTERVAL '2 hours', arrival_time=NOW()-INTERVAL '1 hour' WHERE id=$1",
      [trip]
    );
    const completedTrips = await call('get', '/api/ticketing/completed-trips', null, other);
    assert.equal(completedTrips.data.length, 1);
    assert.equal(completedTrips.data[0].tripId, trip);
    await call(
      'post',
      '/api/operations/feedbacks',
      { tripId: trip, content: 'Tốt', ratingStars: 5 },
      other,
      201
    );
    await call('get', '/api/operations/feedbacks', null, admin);
    const demoTrip = (
      await call(
        'post',
        '/api/trips',
        {
          route_id: route,
          bus_plate: '20A-54321',
          departure_time: '2099-01-02T08:00:00+07:00',
          arrival_time: '2099-01-02T09:00:00+07:00',
          base_price: 15000,
        },
        admin,
        201
      )
    ).data.id;
    const demoReservation = await call(
      'post',
      '/api/ticketing/bookings',
      { tripId: demoTrip, seatNumber: 'A01', paymentMethod: 'QR' },
      other,
      201
    );
    process.env.PAYMENT_DEMO_ENABLED = 'false';
    await call(
      'post',
      `/api/ticketing/bookings/${demoReservation.ticketId}/demo-complete`,
      {},
      other,
      404
    );
    process.env.PAYMENT_DEMO_ENABLED = 'true';
    process.env.NODE_ENV = 'production';
    await call(
      'post',
      `/api/ticketing/bookings/${demoReservation.ticketId}/demo-complete`,
      {},
      other,
      404
    );
    process.env.NODE_ENV = 'test';
    process.env.ZALOPAY_APP_ID = '9999';
    process.env.ZALOPAY_KEY1 = 'test-zalo-key1';
    process.env.ZALOPAY_KEY2 = 'test-zalo-key2';
    await call(
      'post',
      `/api/ticketing/bookings/${demoReservation.ticketId}/demo-complete`,
      {},
      passenger,
      403
    );
    const demoCompletion = await call(
      'post',
      `/api/ticketing/bookings/${demoReservation.ticketId}/demo-complete`,
      {},
      other
    );
    assert.equal(demoCompletion.data.tripStatus, 'SCHEDULED');
    assert.equal(
      (await db.query('SELECT status FROM trips WHERE id=$1', [demoTrip])).rows[0].status,
      'SCHEDULED'
    );
    assert.equal(
      (
        await db.query(
          'SELECT t.status AS ticket_status,p.status AS payment_status FROM tickets t JOIN payment_transactions p ON p.ticket_id=t.id WHERE t.id=$1',
          [demoReservation.ticketId]
        )
      ).rows[0].ticket_status,
      'BOOKED'
    );
    assert.equal(
      (
        await db.query('SELECT status FROM payment_transactions WHERE ticket_id=$1', [
          demoReservation.ticketId,
        ])
      ).rows[0].status,
      'SUCCESS'
    );
    const eligibleDemoTrips = await call('get', '/api/ticketing/completed-trips', null, other);
    assert.ok(!eligibleDemoTrips.data.some(item => item.tripId === demoTrip));
    await db.query("UPDATE trips SET status='COMPLETED' WHERE id=$1", [demoTrip]);
    const completedDemoTrips = await call('get', '/api/ticketing/completed-trips', null, other);
    assert.ok(completedDemoTrips.data.some(item => item.tripId === demoTrip));
    const dashboard = await call('get', '/api/operations/dashboard/summary', null, admin);
    assert.equal(Number(dashboard.summary.totalRoutes), 2);
    assert.equal(dashboard.tripOccupancy[0].routeCode, 'TEST');
    assert.equal(dashboard.tripOccupancy.find(item => item.id === demoTrip).status, 'COMPLETED');
    await call(
      'patch',
      `/api/users/${second.data.user.id}/discount-approval`,
      { status: 'APPROVED' },
      admin
    );
    // ---------------------------------------------------------------------------
    // Sprint 3 — Soát vé QR (US 15), thông báo & device token (US 10).
    // ---------------------------------------------------------------------------
    // RBAC: chỉ DRIVER/ADMIN/MANAGER được phép soát vé.
    const demoTicketCode = (
      await db.query('SELECT ticket_code FROM tickets WHERE id=$1', [demoReservation.ticketId])
    ).rows[0].ticket_code;
    await call('post', '/api/tickets/validate-qr', { code: demoTicketCode }, other, 403);

    // Sai chuyến xe → 403 và ghi log REJECTED (không thay đổi trạng thái vé).
    await call(
      'post',
      '/api/tickets/validate-qr',
      { code: demoTicketCode, tripId: trip },
      admin,
      403
    );

    // Vé BOOKED trên đúng chuyến → check-in thành công + log VALID.
    await db.query(
      "UPDATE trips SET status='SCHEDULED',departure_time=NOW()+INTERVAL '10 minutes',arrival_time=NOW()+INTERVAL '70 minutes' WHERE id=$1",
      [demoTrip]
    );
    const sprint3Checkin = await call(
      'post',
      '/api/tickets/validate-qr',
      { code: demoTicketCode, tripId: demoTrip, manual: true },
      admin
    );
    assert.equal(sprint3Checkin.isAlreadyCheckedIn, false);
    assert.ok(sprint3Checkin.validationId);
    assert.equal(
      (await db.query('SELECT status FROM tickets WHERE id=$1', [demoReservation.ticketId])).rows[0]
        .status,
      'CHECKED_IN'
    );
    assert.equal(
      (
        await db.query(
          "SELECT count(*)::int AS n FROM ticket_validation_logs WHERE ticket_id=$1 AND result='VALID'",
          [demoReservation.ticketId]
        )
      ).rows[0].n,
      1
    );

    // Quét lần 2 → isAlreadyCheckedIn=true, không đụng trạng thái thêm lần nữa.
    const sprint3Rescan = await call(
      'post',
      '/api/tickets/validate-qr',
      { code: demoTicketCode, tripId: demoTrip, manual: true },
      admin
    );
    assert.equal(sprint3Rescan.isAlreadyCheckedIn, true);

    // Log kiểm toán: admin xem được (kèm filter kết quả), passenger thì không.
    const allLogs = await call('get', '/api/tickets/validation-logs', null, admin);
    assert.equal(allLogs.success, true);
    assert.ok(allLogs.items.length >= 3); // VALID + ALREADY_USED + REJECTED
    const rejectedLogs = await call(
      'get',
      '/api/tickets/validation-logs?result=REJECTED',
      null,
      admin
    );
    assert.ok(rejectedLogs.items.length >= 1);
    await call('get', '/api/tickets/validation-logs', null, other, 403);

    // Device token (US 10): đăng ký / đăng ký lại (upsert) / liệt kê / gỡ.
    const deviceToken = 'integration-fcm-token-000001';
    const deviceRegister = await call(
      'post',
      '/api/devices/register',
      { deviceToken, platform: 'ANDROID', deviceName: 'Pixel Test' },
      passenger,
      201
    );
    assert.equal(deviceRegister.device.platform, 'ANDROID');
    const deviceReregister = await call(
      'post',
      '/api/devices/register',
      { deviceToken, platform: 'WEB', deviceName: 'Web Test' },
      passenger,
      201
    );
    assert.equal(deviceReregister.device.id, deviceRegister.device.id);
    assert.equal(deviceReregister.device.platform, 'WEB');
    await call(
      'post',
      '/api/devices/register',
      { deviceToken: 'short', platform: 'ANDROID' },
      passenger,
      400
    );
    await call(
      'post',
      '/api/devices/register',
      { deviceToken: 'integration-fcm-token-000002', platform: 'SAILFISH' },
      passenger,
      400
    );
    const deviceList = await call('get', '/api/devices', null, passenger);
    assert.equal(deviceList.devices.length, 1);
    // Người khác không gỡ được token của passenger (idempotent, affected=0).
    const deviceForeign = await call('post', '/api/devices/unregister', { deviceToken }, other);
    assert.equal(deviceForeign.affected, 0);
    const deviceRemove = await call('post', '/api/devices/unregister', { deviceToken }, passenger);
    assert.equal(deviceRemove.affected, 1);
    const deviceRemoveAgain = await call(
      'post',
      '/api/devices/unregister',
      { deviceToken },
      passenger
    );
    assert.equal(deviceRemoveAgain.affected, 0);

    // Notifications (US 10): không có endpoint tạo — gọi thẳng service (ghi qua pool đã patch).
    const notificationService = require('../dist/services/notification.service');
    await notificationService.createNotification(first.data.user.id, {
      type: 'TRIP_UPDATE',
      title: 'Chuyến TEST sắp khởi hành',
      body: 'Vui lòng có mặt sớm tại trạm.',
      data: { tripId: trip },
    });
    await notificationService.createNotification(second.data.user.id, {
      type: 'TRIP_UPDATE',
      title: 'Thông báo riêng của người khác',
    });
    const notifList = await call('get', '/api/notifications?limit=50', null, passenger);
    assert.equal(notifList.success, true);
    assert.equal(notifList.items.length, 2); // approaching + update; excludes other user's update
    assert.ok(notifList.items.every(item => item.user_id === first.data.user.id));
    assert.equal(notifList.unreadCount, 2);
    const notifUnread = await call('get', '/api/notifications/unread-count', null, passenger);
    assert.equal(notifUnread.unreadCount, 2);
    const notifRead = await call(
      'post',
      `/api/notifications/${notifList.items[0].id}/read`,
      {},
      passenger
    );
    assert.equal(notifRead.notification.is_read, true);
    // Người khác không đánh dấu được thông báo của passenger → 404.
    await call('post', `/api/notifications/${notifList.items[0].id}/read`, {}, other, 404);
    const notifReadAll = await call('post', '/api/notifications/read-all', {}, passenger);
    assert.equal(notifReadAll.success, true);
    const notifUnreadAfter = await call('get', '/api/notifications/unread-count', null, passenger);
    assert.equal(notifUnreadAfter.unreadCount, 0);
    // Danh sách của `other` vẫn tách bạch: 1 thông báo chưa đọc.
    const otherNotif = await call('get', '/api/notifications', null, other);
    assert.equal(otherNotif.items.length, 1);
    assert.equal(otherNotif.unreadCount, 1);

    for (const role of ['anon', 'authenticated']) {
      await db.exec('SET ROLE ' + role);
      await assert.rejects(db.query('SELECT password_hash FROM users'), e => e.code === '42501');
      await assert.rejects(
        db.query("INSERT INTO tickets(id,trip_id) VALUES ('forged','x')"),
        e => e.code === '42501'
      );
      // Sprint 3: 3 bảng mới cũng phải bị REVOKE toàn bộ vớianon/authenticated.
      await assert.rejects(
        db.query('SELECT result FROM ticket_validation_logs'),
        e => e.code === '42501'
      );
      await assert.rejects(
        db.query('SELECT device_token FROM user_devices'),
        e => e.code === '42501'
      );
      await assert.rejects(db.query('SELECT title FROM notifications'), e => e.code === '42501');
      await db.exec('RESET ROLE');
      checks += 5;
    }
    assert.equal(
      (
        await db.query(
          "SELECT count(*)::int AS n FROM pg_tables WHERE schemaname='public' AND rowsecurity"
        )
      ).rows[0].n,
      36
    );
    await require('./test-ui-contract.cjs')({
      app,
      db,
      call,
      request,
      route,
      stops,
      admin,
      passenger,
      other,
      second,
      momoCallback,
    });
    await require('./test-email-contract.cjs')({
      app,
      db,
      call,
      request,
      route,
      admin,
      momoCallback,
    });
    await require('./test-product-features.cjs')({
      app,
      db,
      call,
      request,
      route,
      admin,
      momoCallback,
    });
    await require('./test-password-reset.cjs')({ db, call });
    await call('delete', `/api/routes/${route}`, null, admin);
    await call('delete', `/api/routes/${routeWithStops}`, null, admin);
    assert.equal((await call('get', '/api/routes')).data.length, 0);
    console.log(`PASS: ${checks} API/database checks against embedded PostgreSQL`);
  } finally {
    await db.close();
    await pool.end();
    await new Promise(resolve => gatewayServer.close(resolve));
  }
}
main().catch(e => {
  console.error(e);
  process.exitCode = 1;
});

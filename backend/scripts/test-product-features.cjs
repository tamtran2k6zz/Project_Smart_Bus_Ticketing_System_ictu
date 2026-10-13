const assert = require('node:assert/strict');
const { createHmac } = require('node:crypto');
module.exports = async ({ db, call, admin, route, momoCallback, request, app }) => {
  const base = '/api/smartbus/v1';
  const registered = await call(
    'post',
    base + '/auth/register',
    {
      name: 'Khách tính năng mới',
      email: 'features@example.test',
      phone: '0908880001',
      password: 'Features@1234',
    },
    null,
    201
  );
  const passenger = registered.data.tokens.accessToken,
    userId = registered.data.user.id;
  await db.query('UPDATE users SET email_verified_at=NOW() WHERE id=$1', [userId]);
  await call('get', base + '/schedules', null, passenger, 403);
  await call('get', base + '/refund-jobs', null, passenger, 403);
  await call(
    'post',
    base + '/users',
    { name: 'Forbidden', email: 'forbidden@example.test', password: 'Password@123', role: 'ADMIN' },
    passenger,
    403
  );
  const driverUser = await call(
    'post',
    base + '/users',
    {
      name: 'Tài xế mới',
      email: 'features-driver@example.test',
      phone: '0908880002',
      password: 'Driver@1234',
      role: 'DRIVER',
    },
    admin
  );
  const conductorUser = await call(
    'post',
    base + '/users',
    {
      name: 'Phụ xe mới',
      email: 'features-conductor@example.test',
      phone: '0908880003',
      password: 'Driver@1234',
      role: 'DRIVER',
    },
    admin
  );
  const driverToken = (
    await call('post', base + '/auth/login', {
      identifier: driverUser.email,
      password: 'Driver@1234',
    })
  ).data.tokens.accessToken;
  const conductorToken = (
    await call('post', base + '/auth/login', {
      identifier: conductorUser.email,
      password: 'Driver@1234',
    })
  ).data.tokens.accessToken;
  const driver = await call(
    'post',
    base + '/operations/staff',
    { name: 'Tài xế mới', phone: '0908880002', userId: driverUser.id },
    admin
  );
  const conductor = await call(
    'post',
    base + '/operations/staff',
    { name: 'Phụ xe mới', phone: '0908880003', userId: conductorUser.id },
    admin
  );
  const vehicle = await call(
    'post',
    base + '/operations/vehicles',
    { plate: '20B-FEATURE', name: 'STANDARD', capacity: 20, active: true },
    admin
  );
  const template = {
    name: 'Lịch test',
    routeId: route,
    from: '2099-03-01',
    to: '2099-03-01',
    startTime: '08:00',
    endTime: '09:00',
    headway: 30,
    duration: 30,
    weekdays: [0, 1, 2, 3, 4, 5, 6],
    vehicleIds: [vehicle.id],
  };
  const schedule = await call('post', base + '/schedules', template, admin);
  assert.equal(schedule.count, 3);
  await call('post', base + '/schedules', template, admin, 409);
  assert.equal(
    (await call('get', base + '/schedules', null, admin)).filter(s => s.name === 'Lịch test')
      .length,
    1,
    'rollback must not leave a template'
  );
  const scheduled = (
    await db.query('SELECT id FROM trips WHERE schedule_id=$1 ORDER BY departure_time', [
      schedule.id,
    ])
  ).rows;
  const trip = scheduled[0].id;
  const assignment = {
    tripId: trip,
    vehicleId: vehicle.id,
    staffId: driver.id,
    conductorId: conductor.id,
  };
  const crew = await call('post', base + '/operations/assignments', assignment, admin);
  assert.equal(crew.conductorId, conductor.id);
  await call(
    'put',
    base + '/operations/assignments/' + trip,
    { ...assignment, conductorId: driver.id },
    admin,
    400
  );
  assert.ok(
    (await call('get', base + '/staff/trips', null, conductorToken)).some(t => t.id === trip)
  );
  const eligibility = await call(
    'post',
    base + '/eligibility',
    { category: 'Sinh viên', document: 'DEMO-SV002' },
    passenger
  );
  await call('put', base + '/eligibility/' + eligibility.id, { approve: true }, admin);
  const hold = await call(
    'post',
    base + '/holds',
    { tripId: trip, seatIds: ['A01'], quantity: 1 },
    passenger
  );
  const booking = await call(
    'post',
    base + '/bookings',
    { holdId: hold.id, name: 'Khách tính năng mới', phone: '0908880001' },
    passenger
  );
  assert.equal(booking.total, 10500, 'approved eligibility applies the fare policy');
  const order = await call(
    'post',
    base + '/passes',
    { routeId: route, gateway: 'MoMo' },
    passenger
  );
  assert.equal(order.price, 150000);
  await call(
    'post',
    '/api/v1/ticketing/payments/momo/ipn',
    momoCallback(order.id, order.price + 1, 98001),
    null,
    400
  );
  assert.equal((await call('get', base + '/passes', null, passenger)).passes.length, 0);
  const callback = momoCallback(order.id, order.price, 98001);
  await call('post', '/api/v1/ticketing/payments/momo/ipn', callback);
  const pass = (await call('get', base + '/passes', null, passenger)).passes[0];
  assert.ok(pass.token);
  await call('post', '/api/v1/ticketing/payments/momo/ipn', callback);
  assert.equal(
    (await call('get', base + '/passes', null, passenger)).passes[0].expiresAt,
    pass.expiresAt,
    'callback replay must not renew twice'
  );
  const renewal = await call(
    'post',
    base + '/passes',
    { routeId: route, gateway: 'MoMo' },
    passenger
  );
  await call(
    'post',
    '/api/v1/ticketing/payments/momo/ipn',
    momoCallback(renewal.id, renewal.price, 98002)
  );
  const renewed = (await call('get', base + '/passes', null, passenger)).passes[0];
  assert.equal(Date.parse(renewed.expiresAt) - Date.parse(pass.expiresAt), 30 * 86400000);
  await db.query(
    "UPDATE trips SET departure_time=NOW()+INTERVAL '10 minutes',arrival_time=NOW()+INTERVAL '55 minutes' WHERE id=$1",
    [trip]
  );
  await call(
    'post',
    base + '/ticket-validations',
    { tripId: trip, token: pass.token },
    conductorToken,
    409
  );
  const scan = await call(
    'post',
    base + '/ticket-validations',
    { tripId: trip, token: renewed.token },
    conductorToken
  );
  assert.equal(scan.valid, true);
  assert.equal(scan.quantity, 1);
  assert.equal(scan.seatNumbers.length, 1);
  assert.equal(
    (
      await call(
        'post',
        base + '/ticket-validations',
        { tripId: trip, token: renewed.token },
        conductorToken
      )
    ).valid,
    false
  );
  const invalid = JSON.parse(renewed.token);
  invalid.expiresAt = '2199-01-01T00:00:00.000Z';
  await call(
    'post',
    base + '/ticket-validations',
    { tripId: trip, token: JSON.stringify(invalid) },
    conductorToken,
    403
  );
  await call('post', base + '/trips/' + trip + '/delay', { minutes: 12 }, driverToken);
  const day = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
  const perTrip = await call(
    'get',
    base + '/reports/per-trip?from=' + day + '&to=' + day + '&vehicleId=' + vehicle.id,
    null,
    admin
  );
  assert.ok(perTrip.some(t => t.tripId === trip && t.passengers === 1));
  await call('get', base + '/reports/per-trip?from=' + day + '&to=' + day, null, passenger, 403);
  const strategy = await call(
    'get',
    base + '/reports/strategy?from=2020-01-01&to=2020-01-07&forecastDate=' + day,
    null,
    admin
  );
  assert.equal(strategy.sampleTrips, 0);
  assert.deepEqual(strategy.forecasts, []);
  await call(
    'get',
    base + '/reports/strategy?from=2020-01-01&to=2020-01-07&peakFactor=0',
    null,
    admin,
    400
  );
  await call('delete', base + '/schedules/' + schedule.id, null, admin, 409);
  // A pass passenger must also protect an otherwise empty, scheduled trip.
  await db.query("UPDATE trips SET status='SCHEDULED' WHERE id=$1", [trip]);
  await call('delete', base + '/schedules/' + schedule.id, null, admin, 409);
  assert.equal(
    (await db.query('SELECT status FROM trips WHERE id=$1', [trip])).rows[0].status,
    'SCHEDULED'
  );
  const emptySchedule = await call(
    'post',
    base + '/schedules',
    { ...template, name: 'Lịch rỗng', from: '2099-03-02', to: '2099-03-02' },
    admin
  );
  await call('delete', base + '/schedules/' + emptySchedule.id, null, admin);
  assert.ok(
    (
      await db.query('SELECT status FROM trips WHERE schedule_id=$1', [emptySchedule.id])
    ).rows.every(t => t.status === 'CANCELLED')
  );
  const marketing = await call(
    'post',
    base + '/users',
    {
      name: 'Marketing mới',
      email: 'features-marketing@example.test',
      password: 'Marketing@1234',
      role: 'MARKETING',
    },
    admin
  );
  const marketingToken = (
    await call('post', base + '/auth/login', {
      identifier: marketing.email,
      password: 'Marketing@1234',
    })
  ).data.tokens.accessToken;
  await call(
    'post',
    base + '/vouchers',
    { code: 'FEATURES15', percent: 15, expiresAt: '2099-01-01T00:00:00Z', active: true },
    marketingToken
  );
  await call('get', base + '/reports?from=' + day + '&to=' + day, null, marketingToken, 403);
  const audit = await call('get', base + '/audit-logs', null, admin);
  assert.ok(audit.some(a => a.statusCode === 403 && a.path?.includes('reports')));
  // Verify a real signed ZaloPay callback and duplicate handling, using the local fake provider.
  const zaloHold = await call(
    'post',
    base + '/holds',
    { tripId: scheduled[1].id, seatIds: ['A01'], quantity: 1 },
    passenger
  );
  const zaloBooking = await call(
    'post',
    base + '/bookings',
    { holdId: zaloHold.id, name: 'Khách tính năng mới', phone: '0908880001' },
    passenger
  );
  const zalo = await call(
    'post',
    base + '/payments',
    { bookingId: zaloBooking.id, gateway: 'ZaloPay' },
    passenger
  );
  const map = (
    await db.query('SELECT app_trans_id FROM zalopay_orders WHERE order_id=$1', [zalo.id])
  ).rows[0];
  const data = JSON.stringify({
    app_id: Number(process.env.ZALOPAY_APP_ID),
    app_trans_id: map.app_trans_id,
    amount: zalo.amount,
    zp_trans_id: '98003',
  });
  const payload = {
    type: 1,
    data,
    mac: createHmac('sha256', process.env.ZALOPAY_KEY2).update(data).digest('hex'),
  };
  const bad = await call('post', '/api/v1/ticketing/payments/zalopay/ipn', {
    ...payload,
    mac: '0'.repeat(64),
  });
  assert.equal(bad.return_code, 2);
  assert.equal(
    (await call('post', '/api/v1/ticketing/payments/zalopay/ipn', payload)).return_code,
    1
  );
  assert.equal(
    (await call('post', '/api/v1/ticketing/payments/zalopay/ipn', payload)).return_code,
    1
  );
  assert.equal(
    (await call('get', base + '/bookings/' + zaloBooking.id, null, passenger)).status,
    'paid'
  );
  // Provider invoice acceptance is persisted even when email delivery fails;
  // retry sends the same invoice without issuing another one.
  const emailModule = require('../dist/services/email.service');
  const originalEmail = emailModule.sendEmail,
    originalFetch = global.fetch;
  const originalUrl = process.env.INVOICE_API_URL,
    originalKey = process.env.INVOICE_API_TOKEN;
  let issuedCount = 0,
    mailCount = 0;
  process.env.INVOICE_API_URL = 'https://invoice.example.test/issue';
  process.env.INVOICE_API_TOKEN = 'test-invoice-token';
  try {
    global.fetch = async (url, options) => {
      if (url !== 'https://invoice.example.test/issue') return originalFetch(url, options);
      issuedCount++;
      assert.ok(options.headers['Idempotency-Key']);
      return new Response(
        JSON.stringify({
          status: 'issued',
          number: 'TEST-INV-001',
          reference: 'vendor-001',
          documentUrl: 'https://invoice.example.test/document/001',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };
    emailModule.sendEmail = async (to, subject, text, content) => {
      mailCount++;
      assert.equal(to, 'features@example.test');
      assert.ok(content.attachments[0].content.includes('TEST-INV-001'));
      return mailCount > 1;
    };
    await call('post', base + '/bookings/' + zaloBooking.id + '/invoice', {}, passenger, 503);
    const invoice = await call(
      'post',
      base + '/bookings/' + zaloBooking.id + '/invoice',
      {},
      passenger
    );
    assert.equal(invoice.kind, 'provider');
    assert.equal(issuedCount, 1);
    assert.equal(mailCount, 2);
    await call('post', base + '/bookings/' + zaloBooking.id + '/invoice', {}, passenger);
    assert.equal(mailCount, 2);
    const html = await request(app)
      .get(base + '/bookings/' + zaloBooking.id + '/invoice')
      .set('Authorization', 'Bearer ' + passenger);
    assert.equal(html.status, 200);
    assert.ok(html.text.includes('TEST-INV-001'));
  } finally {
    global.fetch = originalFetch;
    emailModule.sendEmail = originalEmail;
    if (originalUrl === undefined) delete process.env.INVOICE_API_URL;
    else process.env.INVOICE_API_URL = originalUrl;
    if (originalKey === undefined) delete process.env.INVOICE_API_TOKEN;
    else process.env.INVOICE_API_TOKEN = originalKey;
  }
  const roster = await call(
    'get',
    base + '/ticket-validations/checked-in?tripId=' + trip,
    null,
    conductorToken
  );
  assert.ok(roster.some(r => r.ticketId === renewed.id));
  const rescheduled = await call(
    'post',
    base + '/trips/' + trip + '/reschedule',
    {
      departure: new Date(Date.now() + 12 * 60000).toISOString(),
      arrival: new Date(Date.now() + 57 * 60000).toISOString(),
    },
    admin
  );
  assert.equal(rescheduled.tripId, trip);
  await call(
    'post',
    base + '/trips/' + trip + '/reschedule',
    { departure: 'invalid', arrival: 'invalid' },
    admin,
    400
  );
  await call(
    'post',
    base + '/trips/' + trip + '/reschedule',
    {
      departure: new Date(Date.now() + 12 * 60000).toISOString(),
      arrival: new Date(Date.now() + 57 * 60000).toISOString(),
    },
    passenger,
    403
  );
  const finance = await call('get', base + '/reports?from=' + day + '&to=' + day, null, admin);
  assert.equal(finance.passRevenue, 300000);
  const monthly = await call(
    'get',
    base + '/reports?from=' + day + '&to=' + day + '&groupBy=month',
    null,
    admin
  );
  assert.equal(monthly.passRevenue, finance.passRevenue);
  assert.ok(monthly.rows.every(r => /^\d{4}-\d{2}$/.test(r.date)));
  await call(
    'get',
    base + '/reports?from=' + day + '&to=' + day + '&groupBy=unknown',
    null,
    admin,
    400
  );
  const feedback = await call(
    'post',
    base + '/support',
    {
      subject: 'Đánh giá chuyến',
      message: 'Trải nghiệm chuyến xe kiểm thử tốt.',
      rating: 5,
      tripId: trip,
    },
    passenger
  );
  assert.equal(feedback.tripId, trip);
  await call(
    'post',
    base + '/support',
    {
      subject: 'Không sở hữu vé',
      message: 'Không thể đánh giá chuyến chưa đặt.',
      rating: 5,
      tripId: scheduled[2].id,
    },
    passenger,
    403
  );
  const extraStop = await call(
    'post',
    base + '/operations/stops',
    { name: 'Trạm xuống kiểm thử', address: 'Địa chỉ test', lat: 22, lng: 106 },
    admin
  );
  const routeStops = (
    await db.query(
      'SELECT s.*,rs.stop_order FROM route_stops rs JOIN bus_stops s ON s.id=rs.stop_id WHERE rs.route_id=$1 ORDER BY rs.stop_order',
      [route]
    )
  ).rows;
  await db.query(
    'INSERT INTO route_stops(route_id,stop_id,stop_order,estimated_time_minutes) VALUES($1,$2,$3,30)',
    [route, extraStop.id, routeStops.at(-1).stop_order + 1]
  );
  const watchedTrip = scheduled[2].id;
  await call(
    'post',
    base + '/notifications/subscriptions',
    { tripId: watchedTrip, boardingStopId: routeStops[1].id, alightingStopId: extraStop.id },
    passenger
  );
  const { notifyApproachingPassengers } = require('../dist/services/notification.service');
  const alerts = async () =>
    (
      await db.query(
        "SELECT id FROM notifications WHERE user_id=$1 AND type='BUS_APPROACHING' AND data->>'tripId'=$2",
        [userId, watchedTrip]
      )
    ).rows.length;
  await notifyApproachingPassengers(watchedTrip, {
    latitude: Number(routeStops[0].latitude),
    longitude: Number(routeStops[0].longitude),
  });
  assert.equal(await alerts(), 0);
  await notifyApproachingPassengers(watchedTrip, {
    latitude: Number(routeStops[1].latitude),
    longitude: Number(routeStops[1].longitude),
  });
  assert.equal(await alerts(), 1);
  await notifyApproachingPassengers(watchedTrip, {
    latitude: Number(routeStops[1].latitude),
    longitude: Number(routeStops[1].longitude),
  });
  assert.equal(await alerts(), 1, 'GPS repeats must not duplicate targeted alerts');
  console.log(
    'PASS: schedule atomicity, crew permissions, eligibility fares, paid pass renewal/replay/QR/capacity, per-trip analytics, marketing RBAC, audit metadata and signed ZaloPay callbacks'
  );
};

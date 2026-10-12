const assert = require('node:assert/strict');
module.exports = async ({
  app,
  db,
  call,
  request,
  route,
  stops,
  admin,
  other,
  second,
  momoCallback,
}) => {
  const prefix = '/api/smartbus/v1';
  const registered = await call(
    'post',
    prefix + '/auth/register',
    {
      name: 'Khách API',
      email: 'ui-passenger@example.test',
      phone: '0901234567',
      password: 'StrongPassword@123',
    },
    null,
    201
  );
  assert.equal(registered.data.user.role, 'PASSENGER');
  const passenger = registered.data.tokens.accessToken;
  assert.equal(registered.data.user.emailVerified, false);
  assert.equal(registered.data.emailSent, false);
  await call(
    'post',
    prefix + '/holds',
    { tripId: 'unverified', seatIds: ['A01'], quantity: 1 },
    passenger,
    403
  );
  await db.query('UPDATE users SET email_verified_at=NOW() WHERE id=$1', [registered.data.user.id]);
  const trip = (
    await call(
      'post',
      '/api/trips',
      {
        route_id: route,
        bus_plate: '20A-12345',
        departure_time: '2099-02-01T01:00:00Z',
        arrival_time: '2099-02-01T02:00:00Z',
        base_price: 15000,
      },
      admin,
      201
    )
  ).data.id;
  const noPayment = await request(app)
    .post('/api/ticketing/bookings')
    .set('Authorization', 'Bearer ' + passenger)
    .send({ tripId: trip, seatNumber: 'A12' });
  assert.equal(noPayment.status, 400);
  const demo = await call(
    'post',
    '/api/ticketing/bookings',
    { tripId: trip, seatNumber: 'A12', paymentMethod: 'QR' },
    passenger,
    201
  );
  const env = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    await call(
      'post',
      '/api/ticketing/bookings/' + demo.ticketId + '/demo-complete',
      {},
      passenger,
      404
    );
  } finally {
    if (env === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = env;
  }
  assert.equal(
    (await db.query('SELECT status FROM payment_transactions WHERE ticket_id=$1', [demo.ticketId]))
      .rows[0].status,
    'PENDING'
  );
  const catalog = await call('get', prefix + '/catalog');
  assert.ok(catalog.routes.some(r => r.id === route));
  assert.ok(catalog.stops.some(s => s.id === stops[0]));
  const session = await call('get', prefix + '/auth/session', null, passenger);
  assert.ok(session.data.id);
  // Changing gateway replaces the attempt, but keeps the original seats and deadline.
  const switchingHold = await call(
    'post',
    prefix + '/holds',
    { tripId: trip, seatIds: ['A08', 'A09'], quantity: 2 },
    passenger
  );
  const switchingBooking = await call(
    'post',
    prefix + '/bookings',
    { holdId: switchingHold.id, name: 'Đổi thanh toán', phone: '0901234567' },
    passenger
  );
  const originalPayment = await call(
    'post',
    prefix + '/payments',
    { bookingId: switchingBooking.id, gateway: 'MoMo' },
    passenger
  );
  await call(
    'post',
    prefix + '/payments',
    { bookingId: switchingBooking.id, gateway: 'VNPay' },
    other,
    404
  );
  const switchedPayment = await call(
    'post',
    prefix + '/payments',
    { bookingId: switchingBooking.id, gateway: 'VNPay' },
    passenger
  );
  assert.equal(switchedPayment.gateway, 'VNPay');
  assert.notEqual(switchedPayment.id, originalPayment.id);
  const restoredPayment = await call(
    'post',
    prefix + '/payments',
    { bookingId: switchingBooking.id, gateway: 'MoMo' },
    passenger
  );
  assert.notEqual(restoredPayment.id, originalPayment.id);
  assert.equal(
    (await call('get', prefix + '/holds/' + switchingHold.id, null, passenger)).expiresAt,
    switchingHold.expiresAt
  );
  assert.equal(
    (
      await db.query(
        "SELECT count(*)::int AS n FROM trip_seats WHERE ticket_id=$1 AND status='LOCKED'",
        [restoredPayment.id]
      )
    ).rows[0].n,
    2
  );
  // A success arriving from an obsolete URL is refunded; it cannot confirm the new booking.
  await call(
    'post',
    '/api/v1/ticketing/payments/momo/ipn',
    momoCallback(originalPayment.id, 30000, 90002),
    null
  );
  assert.equal(
    (
      await db.query('SELECT status FROM payment_transactions WHERE ticket_id=$1', [
        originalPayment.id,
      ])
    ).rows[0].status,
    'REFUNDED'
  );
  assert.equal(
    (await call('get', prefix + '/bookings/' + switchingBooking.id, null, passenger)).status,
    'pending'
  );
  await call(
    'post',
    '/api/v1/ticketing/payments/momo/ipn',
    momoCallback(restoredPayment.id, 30000, 90003),
    null
  );
  assert.equal(
    (await call('get', prefix + '/bookings/' + switchingBooking.id, null, passenger)).status,
    'paid'
  );
  assert.equal(
    (
      await call(
        'post',
        prefix + '/payments',
        { bookingId: switchingBooking.id, gateway: 'VNPay' },
        passenger
      )
    ).id,
    restoredPayment.id
  );
  // A provider/configuration failure after reservation must allow retry and switching.
  const retryHold = await call(
    'post',
    prefix + '/holds',
    { tripId: trip, seatIds: ['B08'], quantity: 1 },
    passenger
  );
  const retryBooking = await call(
    'post',
    prefix + '/bookings',
    { holdId: retryHold.id, name: 'Thử lại thanh toán', phone: '0901234567' },
    passenger
  );
  const accessKey = process.env.MOMO_ACCESS_KEY;
  process.env.MOMO_ACCESS_KEY = '';
  try {
    await call(
      'post',
      prefix + '/payments',
      { bookingId: retryBooking.id, gateway: 'MoMo' },
      passenger,
      502
    );
  } finally {
    process.env.MOMO_ACCESS_KEY = accessKey;
  }
  const incompletePayment = await call(
    'get',
    prefix + '/bookings/' + retryBooking.id + '/payment',
    null,
    passenger
  );
  assert.equal(incompletePayment.status, 'pending');
  assert.equal(incompletePayment.redirectUrl, undefined);
  const retriedPayment = await call(
    'post',
    prefix + '/payments',
    { bookingId: retryBooking.id, gateway: 'MoMo' },
    passenger
  );
  assert.notEqual(retriedPayment.id, incompletePayment.id);
  assert.ok(retriedPayment.redirectUrl);
  const retrySwitched = await call(
    'post',
    prefix + '/payments',
    { bookingId: retryBooking.id, gateway: 'Card' },
    passenger
  );
  assert.equal(retrySwitched.gateway, 'VNPay');
  assert.notEqual(retrySwitched.id, retriedPayment.id);
  assert.equal(
    (
      await call(
        'post',
        prefix + '/payments',
        { bookingId: retryBooking.id, gateway: 'VNPay' },
        passenger
      )
    ).id,
    retrySwitched.id
  );
  await db.query("UPDATE ui_holds SET expires_at=NOW()-INTERVAL '1 second' WHERE id=$1", [
    retryHold.id,
  ]);
  await call(
    'post',
    prefix + '/payments',
    { bookingId: retryBooking.id, gateway: 'Card' },
    passenger,
    409
  );
  await call(
    'post',
    prefix + '/payments',
    { bookingId: retryBooking.id, gateway: 'MoMo' },
    passenger,
    409
  );

  // A slower first request must not redirect the browser to the replaced gateway.
  const raceHold = await call(
    'post',
    prefix + '/holds',
    { tripId: trip, seatIds: ['B09'], quantity: 1 },
    passenger
  );
  const raceBooking = await call(
    'post',
    prefix + '/bookings',
    { holdId: raceHold.id, name: 'Hai tab thanh toán', phone: '0901234567' },
    passenger
  );
  const { PaymentGatewayService } = require('../dist/services/payment-gateway.service');
  const createUrl = PaymentGatewayService.prototype.createPaymentUrl;
  let releaseUrl, notifyStarted;
  const blockedUrl = new Promise(resolve => {
    releaseUrl = resolve;
  });
  const urlStarted = new Promise(resolve => {
    notifyStarted = resolve;
  });
  PaymentGatewayService.prototype.createPaymentUrl = async function (method, ...args) {
    if (method === 'MOMO') {
      notifyStarted();
      await blockedUrl;
    }
    return createUrl.call(this, method, ...args);
  };
  try {
    const firstRequest = request(app)
      .post(prefix + '/payments')
      .set('Authorization', 'Bearer ' + passenger)
      .send({ bookingId: raceBooking.id, gateway: 'MoMo' })
      .then(response => response);
    await urlStarted;
    const activePayment = await call(
      'post',
      prefix + '/payments',
      { bookingId: raceBooking.id, gateway: 'VNPay' },
      passenger
    );
    releaseUrl();
    assert.equal((await firstRequest).status, 409);
    assert.equal(
      (await call('get', prefix + '/bookings/' + raceBooking.id + '/payment', null, passenger)).id,
      activePayment.id
    );
  } finally {
    releaseUrl();
    PaymentGatewayService.prototype.createPaymentUrl = createUrl;
  }
  const hold = await call(
    'post',
    prefix + '/holds',
    { tripId: trip, seatIds: ['A10', 'A11'], quantity: 2 },
    passenger
  );
  assert.equal(hold.quantity, 2);
  assert.equal(hold.status, 'active');
  await call('get', prefix + '/holds/' + hold.id, null, other, 404);
  await call(
    'post',
    prefix + '/holds',
    { tripId: trip, seatIds: ['A11'], quantity: 1 },
    other,
    409
  );
  const booking = await call(
    'post',
    prefix + '/bookings',
    { holdId: hold.id, name: 'Kiểm thử API', phone: '0901234567', voucher: '' },
    passenger
  );
  assert.equal(booking.total, 30000);
  assert.equal(booking.status, 'pending');
  await call('get', prefix + '/bookings/' + booking.id, null, other, 404);
  const payment = await call(
    'post',
    prefix + '/payments',
    { bookingId: booking.id, gateway: 'MoMo' },
    passenger
  );
  assert.equal(payment.amount, 30000);
  assert.equal(payment.redirectUrl, 'https://sandbox.example.test/pay');
  assert.equal(
    (
      await call(
        'post',
        prefix + '/payments',
        { bookingId: booking.id, gateway: 'MoMo' },
        passenger
      )
    ).id,
    payment.id
  );
  assert.equal(
    (await call('get', prefix + '/tickets', null, passenger)).some(t => t.bookingId === booking.id),
    false
  );
  await call(
    'post',
    '/api/v1/ticketing/payments/momo/ipn',
    momoCallback(payment.id, 30000, 90001),
    null
  );
  assert.equal(
    (await call('get', prefix + '/bookings/' + booking.id, null, passenger)).status,
    'paid'
  );
  assert.equal(
    (await call('get', prefix + '/holds/' + hold.id, null, passenger)).status,
    'converted'
  );
  assert.equal(
    (
      await db.query(
        "SELECT count(*)::int AS n FROM trip_seats WHERE ticket_id=$1 AND status='BOOKED'",
        [payment.id]
      )
    ).rows[0].n,
    2,
    'A confirmed two-seat payment must book both seats'
  );
  let ticket = (await call('get', prefix + '/tickets', null, passenger)).find(
    t => t.bookingId === booking.id
  );
  assert.ok(JSON.parse(ticket.token).sig);
  await call('get', prefix + '/ticket-requests', null, passenger, 403);
  await call(
    'post',
    prefix + '/tickets/' + ticket.id + '/requests',
    { kind: 'cancel' },
    other,
    404
  );
  const pending = await call(
    'post',
    prefix + '/tickets/' + ticket.id + '/requests',
    { kind: 'cancel' },
    passenger
  );
  assert.equal(pending.request, 'cancel');
  assert.equal(pending.status, 'valid');
  await db.query(
    "UPDATE trips SET departure_time=NOW()+INTERVAL '10 minutes',arrival_time=NOW()+INTERVAL '70 minutes' WHERE id=$1",
    [trip]
  );
  const heldScan = await call(
    'post',
    prefix + '/ticket-validations',
    { tripId: trip, token: ticket.token },
    admin,
    409
  );
  assert.match(heldScan.message, /hủy\/đổi/);
  await db.query(
    "UPDATE trips SET departure_time='2099-02-01T01:00:00Z',arrival_time='2099-02-01T02:00:00Z' WHERE id=$1",
    [trip]
  );
  await call(
    'post',
    prefix + '/tickets/' + ticket.id + '/requests',
    { kind: 'cancel' },
    passenger,
    409
  );
  assert.ok(
    (await call('get', prefix + '/ticket-requests', null, admin)).some(t => t.id === ticket.id)
  );
  await call('put', prefix + '/ticket-requests/' + ticket.id, { approve: false }, passenger, 403);
  const rejected = await call(
    'put',
    prefix + '/ticket-requests/' + ticket.id,
    { approve: false },
    admin
  );
  assert.equal(rejected.request, undefined);
  const target = (
    await call(
      'post',
      '/api/trips',
      {
        route_id: route,
        bus_plate: '20A-12345',
        departure_time: '2099-02-02T01:00:00Z',
        arrival_time: '2099-02-02T02:00:00Z',
        base_price: 15000,
      },
      admin,
      201
    )
  ).data.id;
  const oldToken = ticket.token;
  await call(
    'post',
    prefix + '/tickets/' + ticket.id + '/requests',
    { kind: 'exchange', exchangeTripId: target },
    passenger
  );
  ticket = await call('put', prefix + '/ticket-requests/' + ticket.id, { approve: true }, admin);
  assert.equal(ticket.tripId, target);
  assert.equal(
    (await call('get', prefix + '/bookings/' + booking.id, null, passenger)).tripId,
    target
  );
  assert.equal(
    (
      await db.query(
        "SELECT count(*)::int AS n FROM trip_seats WHERE ticket_id=$1 AND trip_id=$2 AND status='BOOKED'",
        [ticket.id, target]
      )
    ).rows[0].n,
    2
  );
  await call(
    'post',
    prefix + '/ticket-validations',
    { tripId: target, token: oldToken },
    admin,
    403
  );
  await call(
    'post',
    prefix + '/tickets/' + ticket.id + '/requests',
    { kind: 'exchange', exchangeTripId: trip },
    passenger
  );
  ticket = await call('put', prefix + '/ticket-requests/' + ticket.id, { approve: true }, admin);
  assert.equal(ticket.tripId, trip);
  await call('post', prefix + '/bookings/' + booking.id + '/invoice', {}, passenger, 503);
  const application = await call(
    'post',
    prefix + '/eligibility',
    { category: 'Sinh viên', document: 'SV-12345' },
    passenger
  );
  await call(
    'post',
    prefix + '/eligibility',
    { category: 'Sinh viên', document: 'SV-12345' },
    passenger,
    409
  );
  assert.ok(
    (await call('get', prefix + '/eligibility/pending', null, admin)).some(
      e => e.id === application.id
    )
  );
  assert.equal(
    (await call('put', prefix + '/eligibility/' + application.id, { approve: true }, admin)).status,
    'approved'
  );
  const support = await call(
    'post',
    prefix + '/support',
    { subject: 'Kiểm tra hỗ trợ', message: 'Tôi cần hỗ trợ đặt vé xe.', rating: 4 },
    passenger
  );
  assert.equal(
    (
      await call(
        'put',
        prefix + '/support/' + support.id,
        { reply: 'Nhà xe đã tiếp nhận phản ánh.' },
        admin
      )
    ).reply,
    'Nhà xe đã tiếp nhận phản ánh.'
  );
  await call(
    'put',
    prefix + '/support/' + support.id,
    { reply: 'Không có quyền sửa.' },
    other,
    403
  );
  await db.query("UPDATE users SET status='LOCKED' WHERE id=$1", [session.data.id]);
  await call('get', prefix + '/auth/session', null, passenger, 401);
  await db.query("UPDATE users SET status='ACTIVE' WHERE id=$1", [session.data.id]);
  await call('get', prefix + '/auth/session', null, passenger);
  await call(
    'post',
    prefix + '/ticket-validations',
    { tripId: trip, token: ticket.token },
    admin,
    409
  );
  await call(
    'post',
    '/api/tickets/validate-qr',
    { tripId: trip, code: JSON.parse(ticket.token).ticket_code },
    admin,
    403
  );
  await db.query("UPDATE users SET role='DRIVER',role_id=3 WHERE id=$1", [second.data.user.id]);
  const driver = (
    await call('post', '/api/auth/login', {
      email: 'other@example.test',
      password: 'TestPassword@123',
    })
  ).data.tokens.accessToken;
  await call('get', prefix + '/ticket-validations/checked-in?tripId=' + trip, null, driver, 403);
  await call(
    'post',
    prefix + '/trips/' + trip + '/location',
    { latitude: 21.5, longitude: 105.8 },
    driver,
    403
  );
  await db.query('UPDATE trips SET driver_id=$1 WHERE id=$2', [second.data.user.id, trip]);
  const assignedTrip = (await call('get', prefix + '/staff/trips', null, driver)).find(
    t => t.id === trip
  );
  assert.ok(assignedTrip);
  assert.equal(assignedTrip.checkIn.state, 'not_open');
  assert.equal(
    Date.parse(assignedTrip.checkIn.opensAt),
    Date.parse(assignedTrip.departure) - 30 * 60000
  );
  assert.ok(Number.isFinite(Date.parse(assignedTrip.checkIn.serverTime)));
  const tooEarly = await call(
    'post',
    prefix + '/ticket-validations',
    { tripId: trip, token: ticket.token },
    driver,
    409
  );
  assert.match(tooEarly.message, /Chuyến chưa mở soát vé/);
  assert.match(tooEarly.message, /Giờ mở:/);
  await call(
    'post',
    prefix + '/trips/' + trip + '/location',
    { latitude: 91, longitude: 105.8 },
    driver,
    400
  );
  await call(
    'post',
    prefix + '/trips/' + trip + '/location',
    { latitude: 21.5, longitude: 105.8 },
    driver
  );
  const location = await call('get', prefix + '/trips/' + trip + '/location');
  assert.equal(location.connected, true);
  assert.equal(location.lat, 21.5);
  await call('post', prefix + '/notifications/subscriptions', { tripId: trip }, passenger);
  await call(
    'post',
    prefix + '/incidents',
    { tripId: trip, message: 'Xe gặp sự cố đường sá và sẽ đến trễ.' },
    driver
  );
  assert.ok(
    (await call('get', prefix + '/notifications', null, passenger)).some(n =>
      n.body?.includes('sự cố')
    )
  );
  await db.query(
    "UPDATE trips SET departure_time=NOW()+INTERVAL '10 minutes',arrival_time=NOW()+INTERVAL '70 minutes' WHERE id=$1",
    [trip]
  );
  const scan = await call(
    'post',
    prefix + '/ticket-validations',
    { tripId: trip, token: ticket.token },
    driver
  );
  assert.equal(scan.valid, true);
  assert.equal(scan.quantity, 2);
  assert.equal(scan.seatNumbers.length, 2);
  assert.equal(
    (
      await db.query(
        "SELECT count(*)::int AS n FROM trip_seats WHERE trip_id=$1 AND status='CHECKED_IN'",
        [trip]
      )
    ).rows[0].n,
    2
  );
  const roster = await call(
    'get',
    prefix + '/ticket-validations/checked-in?tripId=' + trip,
    null,
    driver
  );
  assert.equal(roster.length, 1);
  assert.equal(roster[0].quantity, 2);
  await call(
    'post',
    '/api/v1/ticketing/payments/momo/ipn',
    momoCallback(payment.id, 30000, 90001),
    null
  );
  assert.equal(
    (await db.query('SELECT status FROM payment_transactions WHERE ticket_id=$1', [payment.id]))
      .rows[0].status,
    'SUCCESS'
  );
  const day = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
  const report = await call(
    'get',
    prefix + '/reports?from=' + day + '&to=' + day + '&routeId=' + route,
    null,
    admin
  );
  assert.ok(report.revenue >= 30000);
  assert.ok(report.tickets >= 2);
  await call('get', prefix + '/reports?from=' + day + '&to=' + day, null, passenger, 403);
  const nextHold = await call(
    'post',
    prefix + '/holds',
    { tripId: target, seatIds: ['A10', 'A11'], quantity: 2 },
    passenger
  );
  const nextBooking = await call(
    'post',
    prefix + '/bookings',
    { holdId: nextHold.id, name: 'Khách hoàn vé', phone: '0901234567' },
    passenger
  );
  const nextPayment = await call(
    'post',
    prefix + '/payments',
    { bookingId: nextBooking.id, gateway: 'MoMo' },
    passenger
  );
  await call(
    'post',
    '/api/v1/ticketing/payments/momo/ipn',
    momoCallback(nextPayment.id, 30000, 90002),
    null
  );
  await call(
    'post',
    prefix + '/tickets/' + nextPayment.id + '/requests',
    { kind: 'cancel' },
    passenger
  );
  assert.equal(
    (await call('put', prefix + '/ticket-requests/' + nextPayment.id, { approve: true }, admin))
      .status,
    'canceled'
  );
  const canceled = await call('get', prefix + '/bookings/' + nextBooking.id, null, passenger);
  assert.equal(canceled.refund, 'refunded');
  assert.equal(canceled.status, 'canceled');
  assert.equal(
    (
      await db.query('SELECT count(*)::int AS n FROM trip_seats WHERE ticket_id=$1', [
        nextPayment.id,
      ])
    ).rows[0].n,
    0
  );
  const refunds = await call(
    'get',
    prefix + '/reports?from=2099-02-02&to=2099-02-02&routeId=' + route,
    null,
    admin
  );
  assert.ok(refunds.refunds.some(r => r.id === nextBooking.id && r.total === 30000));
  assert.equal(refunds.revenue, 0);
  await db.query('DELETE FROM ui_bookings WHERE id=$1', [nextBooking.id]);
  await db.query('DELETE FROM ui_holds WHERE id=$1', [nextHold.id]);
  const stopA = await call(
    'post',
    prefix + '/operations/stops',
    { name: 'Trạm API A', address: 'Đường A', lat: 21.5, lng: 105.8 },
    admin
  );
  const stopB = await call(
    'post',
    prefix + '/operations/stops',
    { name: 'Trạm API B', address: 'Đường B', lat: 21.6, lng: 105.9 },
    admin
  );
  const uiRoute = await call(
    'post',
    prefix + '/operations/routes',
    {
      code: 'UI-TEST',
      name: 'Tuyến UI test',
      origin: stopA.name,
      destination: stopB.name,
      stopIds: [stopA.id, stopB.id],
      price: 12000,
      active: true,
    },
    admin
  );
  const vehicle = await call(
    'post',
    prefix + '/operations/vehicles',
    { plate: '20A-99999', name: 'Xe test', capacity: 10, active: true },
    admin
  );
  const uiTrip = await call(
    'post',
    prefix + '/operations/trips',
    { routeId: uiRoute.id, vehicleId: vehicle.id, departure: '2099-05-01T01:00:00Z', duration: 60 },
    admin
  );
  await db.query(
    'UPDATE route_stops SET estimated_time_minutes=23 WHERE route_id=$1 AND stop_order=2',
    [uiRoute.id]
  );
  await call(
    'put',
    prefix + '/operations/routes/' + uiRoute.id,
    { ...uiRoute, price: 13000 },
    admin
  );
  assert.equal(
    (
      await db.query(
        'SELECT estimated_time_minutes FROM route_stops WHERE route_id=$1 AND stop_order=2',
        [uiRoute.id]
      )
    ).rows[0].estimated_time_minutes,
    23
  );
  await call(
    'put',
    prefix + '/operations/routes/' + uiRoute.id,
    { ...uiRoute, origin: stopB.name, destination: stopA.name, stopIds: [stopB.id, stopA.id] },
    admin,
    409
  );
  await call(
    'put',
    prefix + '/operations/vehicles/' + vehicle.id,
    { ...vehicle, capacity: 12 },
    admin,
    409
  );
  await call(
    'post',
    prefix + '/operations/trips',
    { routeId: uiRoute.id, vehicleId: vehicle.id, departure: '2099-05-01T01:30:00Z', duration: 60 },
    admin,
    409
  );
  const staff = await call(
    'post',
    prefix + '/operations/staff',
    { userId: second.data.user.id, name: 'Tài xế test', phone: '0901234567' },
    admin
  );
  const assignment = await call(
    'post',
    prefix + '/operations/assignments',
    { tripId: uiTrip.id, vehicleId: vehicle.id, staffId: staff.id },
    admin
  );
  assert.equal(assignment.tripId, uiTrip.id);
  const otherVehicle = await call(
    'post',
    prefix + '/operations/vehicles',
    { plate: '20A-99997', name: 'Xe test 2', capacity: 10, active: true },
    admin
  );
  const otherTrip = await call(
    'post',
    prefix + '/operations/trips',
    {
      routeId: uiRoute.id,
      vehicleId: otherVehicle.id,
      departure: '2099-05-01T03:00:00Z',
      duration: 60,
    },
    admin
  );
  await call(
    'post',
    prefix + '/operations/assignments',
    { tripId: otherTrip.id, vehicleId: otherVehicle.id, staffId: staff.id },
    admin
  );
  await call(
    'put',
    prefix + '/operations/trips/' + otherTrip.id,
    { ...otherTrip, departure: '2099-05-01T01:30:00Z' },
    admin,
    409
  );
  await call('delete', prefix + '/operations/assignments/' + otherTrip.id, null, admin);
  await call('delete', prefix + '/operations/trips/' + otherTrip.id, null, admin);
  await call('delete', prefix + '/operations/vehicles/' + otherVehicle.id, null, admin);
  const search = await call(
    'get',
    prefix +
      '/trips?from=' +
      encodeURIComponent(stopA.name) +
      '&to=' +
      encodeURIComponent(stopB.name) +
      '&date=2099-05-01&time=08:00'
  );
  assert.ok(search.some(t => t.id === uiTrip.id));
  const afterTime = await call(
    'get',
    prefix +
      '/trips?from=' +
      encodeURIComponent(stopA.name) +
      '&to=' +
      encodeURIComponent(stopB.name) +
      '&date=2099-05-01&time=08:01'
  );
  assert.equal(
    afterTime.some(t => t.id === uiTrip.id),
    false
  );
  await call('delete', prefix + '/operations/routes/' + uiRoute.id, null, admin, 409);
  await call('delete', prefix + '/operations/assignments/' + uiTrip.id, null, admin);
  await call('delete', prefix + '/operations/trips/' + uiTrip.id, null, admin);
  await call('delete', prefix + '/operations/staff/' + staff.id, null, admin, 409);
  await db.query('UPDATE trips SET driver_id=NULL WHERE id=$1', [trip]);
  await call('delete', prefix + '/operations/staff/' + staff.id, null, admin);
  await call('delete', prefix + '/operations/routes/' + uiRoute.id, null, admin);
  await call('delete', prefix + '/operations/vehicles/' + vehicle.id, null, admin);
  await call('delete', prefix + '/operations/stops/' + stopA.id, null, admin);
  await call('delete', prefix + '/operations/stops/' + stopB.id, null, admin);
  await db.query("UPDATE users SET role='PASSENGER',role_id=4 WHERE id=$1", [second.data.user.id]);
  // Cleanup only fixture relations; migrations keep production deletion restrictive.
  await db.query('DELETE FROM ui_bookings WHERE id=$1', [booking.id]);
  await db.query('DELETE FROM ui_holds WHERE id=$1', [hold.id]);
  console.log(
    'PASS: UI API contract: JWT session, multi-seat hold/payment/QR/roster, ownership, GPS assignment, production guard, callback idempotency and financial report'
  );
};

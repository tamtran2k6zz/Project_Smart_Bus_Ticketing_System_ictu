const assert = require('node:assert/strict');
module.exports = async ({ db, call, route, admin }) => {
  const base = '/api/smartbus/v1';
  const registered = await call(
    'post',
    base + '/auth/register',
    {
      name: 'Khách chuyển khoản',
      email: 'bank-transfer@example.test',
      phone: '0908899011',
      password: 'BankTransfer@12345',
    },
    null,
    201
  );
  const token = registered.data.tokens.accessToken,
    uid = registered.data.user.id;
  await db.query('UPDATE users SET email_verified_at=NOW() WHERE id=$1', [uid]);
  const trip = (
    await call(
      'post',
      '/api/trips',
      {
        route_id: route,
        bus_plate: '20A-12345',
        departure_time: '2099-07-01T01:00:00Z',
        arrival_time: '2099-07-01T02:00:00Z',
        base_price: 15000,
      },
      admin,
      201
    )
  ).data.id;
  const payment = async seats => {
    const hold = await call(
      'post',
      base + '/holds',
      { tripId: trip, seatIds: seats, quantity: seats.length },
      token
    );
    const booking = await call(
      'post',
      base + '/bookings',
      { holdId: hold.id, name: 'Khách chuyển khoản', phone: '0908899011' },
      token
    );
    const p = await call(
      'post',
      base + '/payments',
      { bookingId: booking.id, gateway: 'BankTransfer' },
      token
    );
    return { p, booking, hold };
  };
  const state = async id =>
    (
      await db.query(
        'SELECT t.status,p.status AS payment_status FROM tickets t JOIN payment_transactions p ON p.ticket_id=t.id WHERE t.id=$1',
        [id]
      )
    ).rows[0];
  const review = (p, bankId, extra = {}, status = 200) =>
    call(
      'post',
      base + '/bank-transfers/' + p.id + '/review',
      { action: 'CONFIRM', receivedAmount: p.amount, bankTransactionId: bankId, ...extra },
      admin,
      status
    );
  const balance = async () =>
    Number((await call('get', base + '/wallet', null, token)).wallet.balance);
  const first = await payment(['A01', 'A02']);
  assert.equal(first.p.gateway, 'BankTransfer');
  assert.equal(first.p.amount, 30000);
  assert.equal(first.p.redirectUrl, undefined);
  assert.equal(first.p.bankTransfer.accountNumber, '19075207874011');
  assert.equal(first.p.bankTransfer.accountHolder, 'TRAN DANG CONG TAM');
  assert.match(first.p.bankTransfer.reference, /^SB[A-Z0-9]{22}$/);
  assert.match(first.p.bankTransfer.qrImage, /^data:image\/png;base64,/);
  assert.equal(
    (
      await call(
        'post',
        base + '/payments',
        { bookingId: first.booking.id, gateway: 'BankTransfer' },
        token
      )
    ).id,
    first.p.id
  );
  await call('get', base + '/bank-transfers/review', null, null, 401);
  await call('get', base + '/bank-transfers/review', null, token, 403);
  await call(
    'post',
    base + '/bank-transfers/' + first.p.id + '/review',
    { action: 'CONFIRM', receivedAmount: 30000, bankTransactionId: 'FORGED' },
    token,
    403
  );
  await call(
    'post',
    base + '/bank-transfers/' + first.p.id + '/submitted',
    { senderReference: 'customer-trace' },
    admin,
    409
  );
  await call('get', base + '/bookings/' + first.booking.id + '/payment', null, admin, 404);
  await call(
    'post',
    base + '/bank-transfers/' + first.p.id + '/submitted',
    { senderReference: 'customer-trace' },
    token
  );
  await call(
    'post',
    base + '/bank-transfers/' + first.p.id + '/submitted',
    { senderReference: 'customer-trace' },
    token
  );
  assert.deepEqual(await state(first.p.id), { status: 'RESERVED', payment_status: 'PENDING' });
  assert.equal(
    (await db.query('SELECT * FROM ticket_email_deliveries WHERE ticket_id=$1', [first.p.id])).rows
      .length,
    0
  );
  await call(
    'post',
    base + '/payments',
    { bookingId: first.booking.id, gateway: 'MoMo' },
    token,
    409
  );
  await review(first.p, '', {}, 400);
  await review(first.p, 'BANK-FIRST', { receivedAmount: '30000' }, 400);
  assert.equal((await review(first.p, 'BANK-FIRST')).status, 'CONFIRMED');
  await review(first.p, 'bank-first');
  assert.deepEqual(await state(first.p.id), { status: 'BOOKED', payment_status: 'SUCCESS' });
  assert.equal(
    (await db.query('SELECT booked_seats FROM trips WHERE id=$1', [trip])).rows[0].booked_seats,
    2
  );
  assert.equal(
    (await call('get', base + '/bookings/' + first.booking.id, null, token)).status,
    'paid'
  );
  assert.equal(
    (await db.query('SELECT * FROM ticket_email_deliveries WHERE ticket_id=$1', [first.p.id])).rows
      .length,
    1
  );
  await review(first.p, 'OTHER-BANK-ID', {}, 409);
  const unique = await payment(['A03']);
  await review(unique.p, 'BANK-FIRST', {}, 409);
  assert.equal(
    (await state(unique.p.id)).payment_status,
    'PENDING',
    'duplicate bank ID rolls back ticket mutation'
  );
  const reject = { action: 'REJECT', note: 'Chưa có giao dịch báo có', bankTransactionId: 'BANK-FIRST' };
  await call('post', base + '/bank-transfers/' + unique.p.id + '/review', reject, admin);
  await call('post', base + '/bank-transfers/' + unique.p.id + '/review', reject, admin);
  assert.equal((await state(unique.p.id)).status, 'CANCELLED');
  assert.equal(
    (await call('get', base + '/holds/' + unique.hold.id, null, token)).status,
    'released'
  );
  // Money can arrive even after a rejection; account for it once without reviving the ticket.
  await review(unique.p, 'BANK-AFTER-REJECT');
  await review(unique.p, 'BANK-AFTER-REJECT');
  assert.equal(await balance(), 15000);
  const late = await payment(['A03']);
  await db.query(
    "UPDATE tickets SET reservation_expires_at=NOW()-INTERVAL '1 second' WHERE id=$1",
    [late.p.id]
  );
  await db.query("UPDATE ui_holds SET expires_at=NOW()-INTERVAL '1 second' WHERE id=$1", [
    late.hold.id,
  ]);
  await db.query(
    "UPDATE trip_seats SET lock_expires_at=NOW()-INTERVAL '1 second' WHERE ticket_id=$1",
    [late.p.id]
  );
  const replacement = await payment(['A03']);
  assert.equal((await review(late.p, 'BANK-LATE')).status, 'REFUNDED');
  await review(late.p, 'BANK-LATE');
  assert.equal(await balance(), 30000);
  assert.equal(
    (
      await db.query("SELECT ticket_id FROM trip_seats WHERE trip_id=$1 AND seat_number='A03'", [
        trip,
      ])
    ).rows[0].ticket_id,
    replacement.p.id,
    'late confirmation must not take replacement seat'
  );
  assert.equal((await state(replacement.p.id)).status, 'RESERVED');
  const mismatch = await payment(['A04']);
  assert.equal(
    (await review(mismatch.p, 'BANK-MISMATCH', { receivedAmount: 12000 })).status,
    'REFUNDED'
  );
  assert.equal(await balance(), 42000, 'credit only the amount actually received');
  const switched = await payment(['A04']);
  const momo = await call(
    'post',
    base + '/payments',
    { bookingId: switched.booking.id, gateway: 'MoMo' },
    token
  );
  assert.notEqual(momo.id, switched.p.id);
  assert.equal((await review(switched.p, 'BANK-OLD-METHOD')).status, 'REFUNDED');
  assert.equal((await state(momo.id)).payment_status, 'PENDING');
  assert.equal(
    (await call('get', base + '/holds/' + switched.hold.id, null, token)).status,
    'active'
  );
  assert.equal(await balance(), 57000);
  // Legacy cancellation must refund bank transfers to the wallet, never an external gateway.
  await call('post', '/api/v1/ticketing/tickets/' + first.p.id + '/cancel', {}, token);
  await call('post', '/api/v1/ticketing/tickets/' + first.p.id + '/cancel', {}, token);
  assert.equal(await balance(), 87000);
  const ledger = await call('get', base + '/wallet', null, token);
  assert.equal(
    ledger.transactions.reduce((sum, t) => sum + Number(t.amount), 0),
    87000
  );
  const listed = await call('get', base + '/bank-transfers/review', null, admin);
  assert.ok(listed.some(t => t.ticket_id === first.p.id && t.reviewed_by));
  for (const role of ['anon', 'authenticated']) {
    await db.exec('SET ROLE ' + role);
    await assert.rejects(db.query('SELECT * FROM bank_transfer_payments'), e => e.code === '42501');
    await db.exec('RESET ROLE');
  }
  console.log(
    'PASS: Techcombank manual settlement, permissions, QR, idempotency, late/mismatched/switched transfers, wallet reconciliation and cancellation'
  );
};

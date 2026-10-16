const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
module.exports = async ({ db, call, route, admin, momoCallback }) => {
  const base = '/api/smartbus/v1';
  const registration = await call(
    'post',
    base + '/auth/register',
    {
      name: 'Khách trả ví',
      email: 'wallet-checkout@example.test',
      phone: '0908899041',
      password: 'WalletCheckout@12345',
    },
    null,
    201
  );
  const token = registration.data.tokens.accessToken,
    uid = registration.data.user.id;
  const other = await call(
    'post',
    base + '/auth/register',
    {
      name: 'Khách khác',
      email: 'wallet-checkout-other@example.test',
      phone: '0908899042',
      password: 'WalletCheckout@12345',
    },
    null,
    201
  );
  await db.query('UPDATE users SET email_verified_at=NOW() WHERE id=ANY($1::text[])', [
    [uid, other.data.user.id],
  ]);
  const overview = () => call('get', base + '/wallet', null, token);
  const balance = async () => Number((await overview()).wallet.balance);
  assert.equal(await balance(), 0);
  const topup = await call(
    'post',
    base + '/wallet/topup',
    { amount: 100000, method: 'MOMO', requestKey: randomUUID() },
    token
  );
  assert.equal(await balance(), 0);
  await call('post', '/api/v1/ticketing/payments/momo/ipn', momoCallback(topup.id, 100000, 889941));
  assert.equal(await balance(), 100000);
  const trip = (
    await call(
      'post',
      '/api/trips',
      {
        route_id: route,
        bus_plate: '20A-12345',
        departure_time: '2099-09-05T01:00:00Z',
        arrival_time: '2099-09-05T02:00:00Z',
        base_price: 15000,
      },
      admin,
      201
    )
  ).data.id;
  async function book(seats) {
    const hold = await call(
      'post',
      base + '/holds',
      { tripId: trip, seatIds: seats, quantity: seats.length },
      token
    );
    const booking = await call(
      'post',
      base + '/bookings',
      { holdId: hold.id, name: 'Khách trả ví', phone: '0908899041' },
      token
    );
    return { hold, booking };
  }
  const { booking } = await book(['A01', 'A02']);
  const pay = (id, expected = 200, actor = token, extra = {}) =>
    call(
      'post',
      base + '/payments',
      { bookingId: id, gateway: 'Wallet', ...extra },
      actor,
      expected
    );
  await pay(booking.id, 404, other.data.tokens.accessToken);
  await db.query('UPDATE users SET email_verified_at=NULL WHERE id=$1', [uid]);
  await pay(booking.id, 403);
  await db.query('UPDATE users SET email_verified_at=NOW() WHERE id=$1', [uid]);
  await db.query("UPDATE user_wallets SET status='LOCKED' WHERE user_id=$1", [uid]);
  await pay(booking.id, 409);
  await db.query("UPDATE user_wallets SET status='ACTIVE' WHERE user_id=$1", [uid]);
  assert.equal(await balance(), 100000);
  const withdrawal = await call(
    'post',
    base + '/wallet/withdrawals',
    {
      amount: 90000,
      bankName: 'Test bank',
      bankAccountNumber: '0123456789',
      accountHolderName: 'KHACH THU',
      requestKey: randomUUID(),
    },
    token
  );
  await pay(booking.id, 409);
  assert.equal(await balance(), 10000, 'reserved withdrawal funds cannot be spent');
  assert.equal(
    (await db.query('SELECT ticket_id FROM ui_bookings WHERE id=$1', [booking.id])).rows[0]
      .ticket_id,
    null
  );
  await call(
    'post',
    base + '/wallet/withdrawals/' + withdrawal.id + '/review',
    { status: 'REJECTED', note: 'Kiểm thử trả lại tiền giữ' },
    admin
  );
  const payment = await pay(booking.id, 200, token, { amount: 1, userId: other.data.user.id });
  assert.equal(payment.status, 'paid');
  assert.equal(payment.gateway, 'Wallet');
  assert.equal(payment.amount, 30000, 'charge the stored booking total, never client amount');
  assert.equal(await balance(), 70000);
  for (const replay of await Promise.all([pay(booking.id), pay(booking.id)]))
    assert.equal(replay.id, payment.id);
  assert.equal(await balance(), 70000, 'replay cannot debit twice');
  const ledger = await db.query(
    "SELECT * FROM wallet_transactions WHERE type='PAYMENT' AND reference_id=$1",
    [payment.id]
  );
  assert.equal(ledger.rows.length, 1);
  assert.equal(Number(ledger.rows[0].balance_before), 100000);
  assert.equal(Number(ledger.rows[0].balance_after), 70000);
  assert.equal(
    (await call('get', base + '/bookings/' + booking.id + '/payment', null, token)).gateway,
    'Wallet'
  );
  assert.ok((await call('get', base + '/tickets/' + payment.id, null, token)).token);
  assert.equal(
    (
      await db.query(
        "SELECT count(*)::int AS n FROM trip_seats WHERE ticket_id=$1 AND status='BOOKED'",
        [payment.id]
      )
    ).rows[0].n,
    2
  );
  const expired = await book(['A03']);
  await db.query("UPDATE ui_holds SET expires_at=NOW()-INTERVAL '1 second' WHERE id=$1", [
    expired.hold.id,
  ]);
  await pay(expired.booking.id, 409);
  assert.equal(await balance(), 70000);
  await call('post', '/api/v1/ticketing/tickets/' + payment.id + '/cancel', {}, token);
  await call('post', '/api/v1/ticketing/tickets/' + payment.id + '/cancel', {}, token);
  assert.equal(await balance(), 100000, 'cancellation returns the wallet payment exactly once');
  assert.equal(
    (
      await db.query(
        "SELECT count(*)::int AS n FROM wallet_transactions WHERE type='REFUND' AND reference_id=$1",
        [payment.id]
      )
    ).rows[0].n,
    1
  );
  const transfer = await book(['A04']);
  const bank = await call(
    'post',
    base + '/payments',
    { bookingId: transfer.booking.id, gateway: 'BankTransfer' },
    token
  );
  await call(
    'post',
    base + '/bank-transfers/' + bank.id + '/submitted',
    { senderReference: 'Wallet switch guard' },
    token
  );
  await pay(transfer.booking.id, 409);
  assert.equal(await balance(), 100000, 'submitted bank transfers cannot also debit the wallet');
  console.log(
    'PASS: funded-wallet ticket checkout, ownership, verification, locked/insufficient wallet, atomic multi-seat settlement, replay, expiry, refund and submitted-transfer guard'
  );
};

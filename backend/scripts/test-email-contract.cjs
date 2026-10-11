const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');

module.exports = async ({ app, db, call, request, route, admin, momoCallback }) => {
  const prefix = '/api/smartbus/v1';
  const nodemailer = require('nodemailer');
  const originalTransport = nodemailer.createTransport;
  const saved = Object.fromEntries(
    ['SMTP_HOST', 'SMTP_FROM', 'FRONTEND_PUBLIC_URL'].map(key => [key, process.env[key]])
  );
  const mail = [];
  let accept = true;
  nodemailer.createTransport = () => ({
    sendMail: async message => {
      mail.push(message);
      return { accepted: accept ? [message.to] : [] };
    },
    close: () => {},
  });
  process.env.SMTP_HOST = 'smtp.example.test';
  process.env.SMTP_FROM = 'SmartBus <sender@example.test>';
  process.env.FRONTEND_PUBLIC_URL = 'https://frontend.example.test';
  const tokenOf = message =>
    new URLSearchParams(new URL(message.text.match(/https:\/\/[^\s]+/)[0]).hash.slice(1)).get(
      'token'
    );
  try {
    await call(
      'post',
      prefix + '/auth/register',
      { name: 'Invalid email', email: 'not-an-email', password: 'StrongPassword@123' },
      null,
      400
    );
    const reg = await call(
      'post',
      prefix + '/auth/register',
      { name: 'Email contract', email: 'verified@example.test', password: 'StrongPassword@123' },
      null,
      201
    );
    const userId = reg.data.user.id,
      auth = reg.data.tokens.accessToken;
    assert.equal(reg.data.emailSent, true);
    assert.equal(reg.data.user.emailVerified, false);
    const firstToken = tokenOf(mail[0]);
    assert.match(firstToken, /^[a-f0-9]{64}$/);
    assert.equal(JSON.stringify(reg).includes(firstToken), false);
    const stored = (
      await db.query('SELECT verification_token_hash,email_verified_at FROM users WHERE id=$1', [
        userId,
      ])
    ).rows[0];
    assert.equal(stored.email_verified_at, null);
    assert.equal(
      stored.verification_token_hash,
      createHash('sha256').update(firstToken).digest('hex')
    );
    await call(
      'post',
      prefix + '/holds',
      { tripId: 'unused', seatIds: ['A01'], quantity: 1 },
      auth,
      403
    );
    await call('post', prefix + '/auth/resend-verification', {}, auth, 429);
    await call('post', prefix + '/auth/verify-email', { token: '0'.repeat(64) }, null, 400);
    await db.query(
      "UPDATE users SET verification_sent_at=NOW()-INTERVAL '61 seconds' WHERE id=$1",
      [userId]
    );
    await call('post', prefix + '/auth/resend-verification', {}, auth);
    const newToken = tokenOf(mail[1]);
    assert.notEqual(newToken, firstToken);
    await call('post', prefix + '/auth/verify-email', { token: firstToken }, null, 400);
    await db.query(
      "UPDATE users SET verification_expires_at=NOW()-INTERVAL '1 second' WHERE id=$1",
      [userId]
    );
    await call('post', prefix + '/auth/verify-email', { token: newToken }, null, 400);
    await db.query(
      "UPDATE users SET verification_sent_at=NOW()-INTERVAL '61 seconds' WHERE id=$1",
      [userId]
    );
    await call('post', prefix + '/auth/resend-verification', {}, auth);
    const validToken = tokenOf(mail[2]);
    await call('post', prefix + '/auth/verify-email', { token: validToken });
    await call('post', prefix + '/auth/verify-email', { token: validToken }, null, 400);
    const me = await call('get', prefix + '/auth/session', null, auth);
    assert.equal(me.data.emailVerified, true);
    const sentBefore = mail.length;
    assert.equal(
      (await call('post', prefix + '/auth/resend-verification', {}, auth)).emailVerified,
      true
    );
    assert.equal(mail.length, sentBefore);
    const trip = (
      await call(
        'post',
        '/api/trips',
        {
          route_id: route,
          bus_plate: '20A-12345',
          departure_time: '2099-06-01T01:00:00Z',
          arrival_time: '2099-06-01T02:00:00Z',
          base_price: 15000,
        },
        admin,
        201
      )
    ).data.id;
    const hold = await call(
      'post',
      prefix + '/holds',
      { tripId: trip, seatIds: ['A01', 'A02'], quantity: 2 },
      auth
    );
    const booking = await call(
      'post',
      prefix + '/bookings',
      { holdId: hold.id, name: 'Email contract', phone: '0903333333' },
      auth
    );
    const payment = await call(
      'post',
      prefix + '/payments',
      { bookingId: booking.id, gateway: 'MoMo' },
      auth
    );
    assert.equal(mail.length, sentBefore, 'Pending payment must not send a ticket');
    await call('post', '/api/ticketing/payments/momo/ipn', momoCallback(payment.id, 30000, 91111));
    const ticketMail = mail.at(-1);
    assert.equal(ticketMail.to, 'verified@example.test');
    assert.match(ticketMail.text, /A01, A02/);
    assert.match(ticketMail.text, /30\.000/);
    assert.ok(ticketMail.text.includes('/account/tickets/' + payment.id));
    assert.equal(ticketMail.attachments[0].contentType, 'image/png');
    assert.equal(Buffer.isBuffer(ticketMail.attachments[0].content), true);
    assert.equal(ticketMail.attachments[0].content.subarray(1, 4).toString(), 'PNG');
    assert.match(ticketMail.html, /cid:smartbus-ticket-qr/);
    assert.equal(
      (await call('get', prefix + '/bookings/' + booking.id, null, auth)).ticketEmailStatus,
      'sent'
    );
    const afterSuccess = mail.length;
    await call('post', '/api/ticketing/payments/momo/ipn', momoCallback(payment.id, 30000, 91111));
    assert.equal(mail.length, afterSuccess, 'Repeated callback must not duplicate mail');
    assert.equal(
      (
        await db.query('SELECT attempts FROM ticket_email_deliveries WHERE ticket_id=$1', [
          payment.id,
        ])
      ).rows[0].attempts,
      1
    );
    // SMTP rejection preserves the paid ticket and a durable retry record.
    const hold2 = await call(
      'post',
      prefix + '/holds',
      { tripId: trip, seatIds: ['A03'], quantity: 1 },
      auth
    );
    const booking2 = await call(
      'post',
      prefix + '/bookings',
      { holdId: hold2.id, name: 'Email contract', phone: '0903333333' },
      auth
    );
    const payment2 = await call(
      'post',
      prefix + '/payments',
      { bookingId: booking2.id, gateway: 'MoMo' },
      auth
    );
    accept = false;
    await call('post', '/api/ticketing/payments/momo/ipn', momoCallback(payment2.id, 15000, 91112));
    assert.equal(
      (await db.query('SELECT status FROM tickets WHERE id=$1', [payment2.id])).rows[0].status,
      'BOOKED'
    );
    assert.equal(
      (await call('get', prefix + '/bookings/' + booking2.id, null, auth)).ticketEmailStatus,
      'pending'
    );
    accept = true;
    await db.query('UPDATE ticket_email_deliveries SET next_attempt_at=NOW() WHERE ticket_id=$1', [
      payment2.id,
    ]);
    const service = require('../dist/services/ticket-email.service');
    const sent = await Promise.all([
      service.deliverTicketEmail(payment2.id),
      service.deliverTicketEmail(payment2.id),
    ]);
    assert.equal(sent.filter(Boolean).length, 1, 'Parallel workers must claim only once');
    assert.equal(
      (await call('get', prefix + '/bookings/' + booking2.id, null, auth)).ticketEmailStatus,
      'sent'
    );
    assert.equal(
      (
        await db.query('SELECT attempts FROM ticket_email_deliveries WHERE ticket_id=$1', [
          payment2.id,
        ])
      ).rows[0].attempts,
      2
    );
    // Exhausted retries are visible instead of claiming delivery succeeded.
    await db.query(
      "UPDATE ticket_email_deliveries SET status='pending',attempts=4,next_attempt_at=NOW() WHERE ticket_id=$1",
      [payment2.id]
    );
    accept = false;
    await service.deliverTicketEmail(payment2.id);
    assert.equal(
      (await call('get', prefix + '/bookings/' + booking2.id, null, auth)).ticketEmailStatus,
      'failed'
    );
    await db.query(
      "UPDATE ticket_email_deliveries SET status='pending',attempts=0,next_attempt_at=NOW() WHERE ticket_id=$1",
      [payment2.id]
    );
    await db.query("UPDATE tickets SET status='CANCELLED' WHERE id=$1", [payment2.id]);
    const beforeCanceled = mail.length;
    await service.deliverTicketEmail(payment2.id);
    assert.equal(mail.length, beforeCanceled);
    assert.equal(
      (
        await db.query('SELECT status FROM ticket_email_deliveries WHERE ticket_id=$1', [
          payment2.id,
        ])
      ).rows[0].status,
      'skipped'
    );
    await db.query('DELETE FROM ui_bookings WHERE id=ANY($1::text[])', [[booking.id, booking2.id]]);
    await db.query('DELETE FROM ui_holds WHERE id=ANY($1::text[])', [[hold.id, hold2.id]]);
    await db.query('DELETE FROM trip_seats WHERE trip_id=$1', [trip]);
    await db.query('DELETE FROM payment_transactions WHERE ticket_id=ANY($1::text[])', [
      [payment.id, payment2.id],
    ]);
    await db.query('DELETE FROM tickets WHERE trip_id=$1', [trip]);
    await db.query('DELETE FROM trips WHERE id=$1', [trip]);
    console.log(
      'PASS: email ownership, one-use/expired/rotated verification, verified-only booking, paid ticket QR mail, callback dedupe, SMTP rejection and durable retries'
    );
  } finally {
    nodemailer.createTransport = originalTransport;
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
};

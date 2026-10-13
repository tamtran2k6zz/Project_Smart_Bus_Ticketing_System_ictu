// Creates demo tickets through the real booking/payment API and signed local callbacks.
const fs = require('node:fs');
const path = require('node:path');
const port = Number(process.env.DEMO_API_PORT || 5010),
  origin = 'http://127.0.0.1:' + port;
async function main() {
  const capabilities = await fetch(origin + '/api/smartbus/v1/capabilities').then(r => r.json());
  if (!capabilities.localDemo) throw new Error('Only an isolated local demo may be prepared.');
  const ids = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '../demo-output/ids.json'), 'utf8')
  );
  let token;
  const api = async (p, body) => {
    const r = await fetch(origin + '/api/smartbus/v1' + p, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(p + ': ' + data.message);
    return data;
  };
  const login = await api('/auth/login', {
    identifier: 'passenger@smartbus.demo',
    password: 'SmartBus123!',
  });
  token = login.data.tokens.accessToken;
  const existing = await api('/bookings');
  const prepared = [];
  for (const [purpose, seat] of [
    ['cancel', 'A01'],
    ['exchange', 'A02'],
  ]) {
    let booking = existing.find(
      b => b.tripId === ids.futureTrip && b.seatIds.includes(seat) && b.status === 'paid'
    );
    if (!booking) {
      const hold = await api('/holds', { tripId: ids.futureTrip, seatIds: [seat], quantity: 1 });
      booking = await api('/bookings', {
        holdId: hold.id,
        name: 'Demo PASSENGER',
        phone: '0901234560',
      });
      const payment = await api('/payments', { bookingId: booking.id, gateway: 'MoMo' });
      const result = await fetch(origin + '/demo-gateway/' + payment.id + '/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true }),
      }).then(r => r.json());
      if (!result.redirect) throw new Error('Demo callback failed.');
    }
    const tickets = await api('/tickets');
    const ticket = tickets.find(t => t.bookingId === booking.id);
    if (!ticket) throw new Error('No ticket issued.');
    prepared.push({
      purpose,
      bookingId: booking.id,
      ticketId: ticket.id,
      seat,
      url: '/account/tickets/' + ticket.id,
    });
  }
  fs.writeFileSync(
    path.resolve(__dirname, '../demo-output/prepared.json'),
    JSON.stringify({ tickets: prepared, exchangeTrip: ids.exchangeTrip }, null, 2)
  );
  console.log(
    'Đã chuẩn bị 2 vé thanh toán: A01 để hủy, A02 để đổi chuyến. Xem backend/demo-output/prepared.json.'
  );
}
main().catch(e => {
  console.error(e.message);
  process.exitCode = 1;
});

import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { query, transaction } from '../config/database';
import { getJwtSecret } from '../config/auth';
import { assertEmailVerified } from './email-verification.service';
import { PaymentGatewayService, OnlinePaymentMethod } from './payment-gateway.service';
import { assertTripAccess } from './trip-access.service';
import { userFarePolicy } from './fare-policy.service';
import { prepareSeats } from './booking';
import { PoolClient } from 'pg';
const fail = (message: string, status = 400): never => {
  throw Object.assign(new Error(message), { status });
};
const sign = (value: string) => createHmac('sha256', getJwtSecret()).update(value).digest('hex');
function passDto(p: any) {
  const data = {
    kind: 'monthly-pass',
    id: p.id,
    userId: p.user_id,
    routeId: p.route_id,
    expiresAt: new Date(p.expires_at).toISOString(),
    nonce: p.qr_secret,
  };
  return {
    ...data,
    status: p.status,
    startsAt: new Date(p.starts_at).toISOString(),
    price: Number(p.price),
    token: JSON.stringify({ ...data, sig: sign(JSON.stringify(data)) }),
  };
}
const orderDto = (o: any) => ({
  id: o.id,
  orderId: o.id,
  userId: o.user_id,
  routeId: o.route_id,
  price: Number(o.amount),
  status: o.status.toLowerCase(),
  redirectUrl: o.payment_url,
  createdAt: o.created_at,
});
// Shared activation for verified gateway payments and atomic wallet payments.
export async function activatePass(
  client: PoolClient,
  userId: string,
  routeId: string,
  amount: number
) {
  const {
    rows: [existing],
  } = await client.query(
    'SELECT * FROM monthly_passes WHERE user_id=$1 AND route_id=$2 FOR UPDATE',
    [userId, routeId]
  );
  const now = new Date();
  const active =
    existing?.status === 'active' && new Date(existing.expires_at).getTime() > now.getTime();
  const starts = active ? existing.starts_at : now;
  const expires = new Date(
    (active ? new Date(existing.expires_at).getTime() : now.getTime()) + 30 * 86400000
  );
  const {
    rows: [pass],
  } = await client.query(
    `INSERT INTO monthly_passes(id,user_id,route_id,starts_at,expires_at,price,qr_secret)
     VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(user_id,route_id) DO UPDATE SET starts_at=$4,expires_at=$5,price=$6,status='active' RETURNING *`,
    [
      existing?.id || randomUUID(),
      userId,
      routeId,
      starts,
      expires,
      amount,
      existing?.qr_secret || randomUUID(),
    ]
  );
  return pass;
}
export async function listPasses(userId: string) {
  const policy = await userFarePolicy(userId);
  return {
    passes: (
      await query<any[]>('SELECT * FROM monthly_passes WHERE user_id=$1 ORDER BY expires_at DESC', [
        userId,
      ])
    ).map(passDto),
    policy,
    orders: (
      await query<any[]>(
        "SELECT * FROM pass_orders WHERE user_id=$1 AND status='PENDING' ORDER BY created_at DESC",
        [userId]
      )
    ).map(orderDto),
    eligibility: (
      await query<any[]>('SELECT * FROM eligibility_applications WHERE user_id=$1', [userId])
    ).map(e => ({
      id: e.id,
      userId: e.user_id,
      category: e.category,
      document: e.document,
      status: e.status,
    })),
  };
}
export async function buyPass(
  userId: string,
  routeId: string,
  method: OnlinePaymentMethod,
  ip: string
) {
  await assertEmailVerified(userId);
  if (!['MOMO', 'VNPAY', 'ZALOPAY'].includes(method)) fail('Phương thức thanh toán không hợp lệ.');
  const policy = await userFarePolicy(userId);
  const order = await transaction(async client => {
    await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [userId]);
    const {
      rows: [route],
    } = await client.query(
      "SELECT id FROM routes WHERE id=$1 AND status='ACTIVE' AND deleted_at IS NULL",
      [routeId]
    );
    if (!route) fail('Tuyến không hoạt động.');
    await client.query(
      "UPDATE pass_orders SET status='FAILED' WHERE user_id=$1 AND route_id=$2 AND status='PENDING' AND (created_at<NOW()-INTERVAL '30 minutes' OR payment_url IS NULL)",
      [userId, routeId]
    );
    const {
      rows: [pending],
    } = await client.query(
      "SELECT * FROM pass_orders WHERE user_id=$1 AND route_id=$2 AND status='PENDING'",
      [userId, routeId]
    );
    if (pending) return pending;
    const amount = policy.monthlyPrice;
    if (!Number.isSafeInteger(amount) || amount < 1000)
      fail('Chính sách giá vé tháng chưa hợp lệ.', 503);
    const {
      rows: [created],
    } = await client.query(
      'INSERT INTO pass_orders(id,user_id,route_id,amount,payment_method) VALUES($1,$2,$3,$4,$5) RETURNING *',
      [randomUUID(), userId, routeId, amount, method]
    );
    return created;
  });
  if (!order.payment_url) {
    const url = await new PaymentGatewayService().createPaymentUrl(
      method,
      order.id,
      Number(order.amount),
      ip,
      '/account/passes'
    );
    await query("UPDATE pass_orders SET payment_url=$1 WHERE id=$2 AND status='PENDING'", [
      url,
      order.id,
    ]);
    order.payment_url = url;
  }
  return orderDto(order);
}
export async function confirmPassPayment(
  orderId: string,
  method: string,
  transactionId: string,
  amount: number
): Promise<boolean | null> {
  return transaction(async client => {
    const {
      rows: [identity],
    } = await client.query('SELECT user_id FROM pass_orders WHERE id=$1', [orderId]);
    if (!identity) return null;
    // Serialize different renewals of the same user's pass before locking orders.
    await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [identity.user_id]);
    const {
      rows: [order],
    } = await client.query('SELECT * FROM pass_orders WHERE id=$1 FOR UPDATE', [orderId]);
    if (order.payment_method !== method || Number(order.amount) !== amount) return false;
    if (order.status === 'SUCCESS') return order.gateway_transaction_id === transactionId;
    if (order.status === 'REFUNDED') return false;
    const pass = await activatePass(client, order.user_id, order.route_id, Number(order.amount));
    await client.query(
      "UPDATE pass_orders SET status='SUCCESS',paid_at=NOW(),gateway_transaction_id=$1,pass_id=$2 WHERE id=$3",
      [transactionId, pass.id, order.id]
    );
    return true;
  });
}
export async function failPassPayment(orderId: string, method: string) {
  await query(
    "UPDATE pass_orders SET status='FAILED' WHERE id=$1 AND payment_method=$2 AND status='PENDING'",
    [orderId, method]
  );
}
export async function validatePass(code: string, tripId: string, actor: string, role: string) {
  await assertTripAccess(tripId, actor, role);
  let payload: any;
  try {
    payload = JSON.parse(code);
  } catch {
    fail('QR vé tháng không hợp lệ.');
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload))
    fail('QR vé tháng không hợp lệ.');
  const { sig, ...data } = payload;
  if (data.kind !== 'monthly-pass' || typeof sig !== 'string' || !/^[a-f0-9]{64}$/.test(sig))
    fail('QR vé tháng không hợp lệ.');
  const expected = sign(JSON.stringify(data));
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected)))
    fail('Chữ ký vé tháng không hợp lệ.', 403);
  return transaction(async client => {
    const {
      rows: [pass],
    } = await client.query(
      `SELECT p.*,u.full_name,u.status AS user_status FROM monthly_passes p JOIN users u ON u.id=p.user_id WHERE p.id=$1 FOR UPDATE OF p`,
      [data.id]
    );
    const {
      rows: [trip],
    } = await client.query('SELECT * FROM trips WHERE id=$1 FOR UPDATE', [tripId]);
    if (
      !pass ||
      pass.user_status !== 'ACTIVE' ||
      pass.status !== 'active' ||
      pass.qr_secret !== data.nonce ||
      pass.user_id !== data.userId ||
      pass.route_id !== data.routeId ||
      Date.parse(data.expiresAt) !== new Date(pass.expires_at).getTime()
    )
      fail('Vé tháng đã thay đổi hoặc không hợp lệ.', 409);
    if (
      Date.parse(pass.starts_at) > Date.now() ||
      new Date(pass.expires_at).getTime() <= Date.now()
    )
      fail('Vé tháng chưa có hiệu lực hoặc đã hết hạn.', 409);
    if (
      trip.route_id !== pass.route_id ||
      !['SCHEDULED', 'IN_TRANSIT'].includes(trip.status) ||
      Date.parse(trip.departure_time) > Date.now() + 30 * 60000 ||
      Date.parse(trip.arrival_time) < Date.now() - 30 * 60000
    )
      fail('Vé tháng không dùng được cho chuyến/giờ này.', 409);
    const { rows: prior } = await client.query(
      'SELECT * FROM pass_checkins WHERE pass_id=$1 AND trip_id=$2',
      [pass.id, tripId]
    );
    if (prior.length)
      return {
        valid: true,
        isAlreadyCheckedIn: true,
        ticketId: pass.id,
        ticketCode: pass.id,
        passengerName: pass.full_name,
        seatNumbers: [prior[0].seat_number],
        quantity: 1,
        checkedInAt: prior[0].created_at,
      };
    const {
      rows: [occupancy],
    } = await client.query(
      `SELECT (SELECT COALESCE(SUM(quantity),0) FROM tickets WHERE trip_id=$1 AND status IN ('BOOKED','CHECKED_IN'))+(SELECT count(*) FROM pass_checkins WHERE trip_id=$1) AS n`,
      [tripId]
    );
    if (Number(occupancy.n) >= trip.total_seats) fail('Chuyến đã đủ sức chứa.', 409);
    await prepareSeats(client, tripId);
    const {
      rows: [seat],
    } = await client.query(
      "SELECT seat_number FROM trip_seats WHERE trip_id=$1 AND status='AVAILABLE' ORDER BY seat_number LIMIT 1 FOR UPDATE",
      [tripId]
    );
    if (!seat) fail('Chuyến không còn chỗ trống.', 409);
    await client.query(
      'INSERT INTO pass_checkins(pass_id,trip_id,scanned_by,seat_number) VALUES($1,$2,$3,$4)',
      [pass.id, tripId, actor, seat.seat_number]
    );
    await client.query(
      "UPDATE trip_seats SET status='CHECKED_IN' WHERE trip_id=$1 AND seat_number=$2",
      [tripId, seat.seat_number]
    );
    await client.query('UPDATE trips SET booked_seats=booked_seats+1 WHERE id=$1', [tripId]);
    return {
      valid: true,
      isAlreadyCheckedIn: false,
      ticketId: pass.id,
      ticketCode: pass.id,
      passengerName: pass.full_name,
      seatNumbers: [seat.seat_number],
      quantity: 1,
      checkedInAt: new Date().toISOString(),
    };
  });
}

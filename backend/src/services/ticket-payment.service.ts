import { PoolClient } from 'pg';
import { queueTicketEmail } from './ticket-email.service';

// Shared settlement primitive. Caller verifies the provider or bank statement first.
export async function applyTicketPayment(
  client: PoolClient,
  orderId: string,
  method: string,
  gatewayTransactionId: string,
  amount: number,
  forceLate = false
): Promise<'CONFIRMED' | 'LATE' | 'REFUNDED' | 'INVALID'> {
  const {
    rows: [payment],
  } = await client.query(
    `SELECT p.ticket_id,p.amount,p.status,p.payment_method,p.redis_lock_id,
              t.status AS ticket_status,t.trip_id,t.seat_number,t.user_id,t.ticket_code,
              t.reservation_expires_at,t.quantity
       FROM payment_transactions p JOIN tickets t ON t.id=p.ticket_id
       WHERE p.order_id=$1 FOR UPDATE OF p,t`,
    [orderId]
  );
  if (!payment || payment.payment_method !== method || Number(payment.amount) !== amount)
    return 'INVALID';
  if (payment.status === 'REFUNDED') return 'REFUNDED';
  if (payment.status === 'SUCCESS') {
    return ['BOOKED', 'CHECKED_IN'].includes(payment.ticket_status) ? 'CONFIRMED' : 'LATE';
  }
  if (!['PENDING', 'FAILED'].includes(payment.status)) return 'INVALID';

  const { rows: seats } = await client.query(
    `SELECT status FROM trip_seats WHERE trip_id=$1 AND ticket_id=$2 FOR UPDATE`,
    [payment.trip_id, payment.ticket_id]
  );

  // The UI can reserve multiple seats on one ticket. Never reclaim a seat
  // that has since been released or assigned to another customer's booking.
  const seatsUnavailable =
    seats.length !== Number(payment.quantity) ||
    seats.some(seat => !['LOCKED', 'BOOKED', 'CHECKED_IN'].includes(seat.status));

  const expired =
    forceLate ||
    seatsUnavailable ||
    payment.ticket_status === 'CANCELLED' ||
    (payment.reservation_expires_at &&
      new Date(payment.reservation_expires_at).getTime() <= Date.now());

  await client.query(
    `UPDATE payment_transactions SET status='SUCCESS',gateway_transaction_id=$1,paid_at=NOW()
       WHERE order_id=$2`,
    [gatewayTransactionId, orderId]
  );
  if (expired) return 'LATE';

  await client.query(
    `UPDATE tickets SET status='BOOKED',reservation_expires_at=NULL
       WHERE id=$1 AND status IN ('RESERVED','CANCELLED')`,
    [payment.ticket_id]
  );
  await client.query(
    `UPDATE trip_seats SET status='BOOKED',ticket_id=$1,locked_at=NULL,lock_expires_at=NULL,
       locked_by_user_id=NULL,redis_lock_id=NULL WHERE ticket_id=$1 AND trip_id=$2`,
    [payment.ticket_id, payment.trip_id]
  );
  await client.query('UPDATE trips SET booked_seats=booked_seats+$2 WHERE id=$1', [
    payment.trip_id,
    payment.quantity,
  ]);
  await queueTicketEmail(client, payment.ticket_id);
  return 'CONFIRMED';
}

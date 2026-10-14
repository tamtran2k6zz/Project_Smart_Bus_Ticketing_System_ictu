import { transaction } from '../config/database';
import { releaseSeatLock } from '../config/redis';
import { BookingError } from './booking';
import { enqueueRefund, processRefundJobs } from './refund-queue.service';
import { creditRefundToWallet } from './wallet.service';
export async function cancelTicket(
  id: string,
  userId: string,
  role: string,
  requireRequest = false
) {
  const ticket = await transaction(async client => {
    const {
      rows: [t],
    } = await client.query(
      `SELECT t.id,t.trip_id,t.user_id,t.seat_number,t.quantity,t.status AS ticket_status,p.order_id,p.payment_method,p.amount,p.status AS payment_status,p.gateway_transaction_id,p.refund_request_id,p.paid_at,p.redis_lock_id,tr.departure_time FROM tickets t LEFT JOIN payment_transactions p ON p.ticket_id=t.id JOIN trips tr ON tr.id=t.trip_id WHERE t.id=$1 FOR UPDATE OF t`,
      [id]
    );
    if (!t) throw new BookingError(404, 'Không tìm thấy vé.');
    await client.query('SELECT ticket_id FROM payment_transactions WHERE ticket_id=$1 FOR UPDATE', [
      id,
    ]);
    if (requireRequest) {
      const {
        rows: [pending],
      } = await client.query('SELECT kind FROM ticket_requests WHERE ticket_id=$1 FOR UPDATE', [
        id,
      ]);
      if (pending?.kind !== 'cancel')
        throw new BookingError(409, 'Yêu cầu hủy đã thay đổi hoặc đã được xử lý.');
    }
    if (!['ADMIN', 'MANAGER'].includes(role ?? '') && t.user_id !== userId)
      throw new BookingError(403, 'Bạn không có quyền hủy vé này.');
    if (new Date(t.departure_time).getTime() <= Date.now() + 30 * 60000)
      throw new BookingError(400, 'Hủy vé phải thực hiện trước giờ chạy ít nhất 30 phút.');
    if (t.ticket_status === 'CHECKED_IN') throw new BookingError(400, 'Vé đã soát, không thể hủy.');
    if (t.ticket_status === 'CANCELLED') throw new BookingError(409, 'Vé đã được hủy.');
    if (t.payment_status === 'PENDING')
      throw new BookingError(409, 'Thanh toán đang chờ xác nhận.');
    
    if (t.payment_status === 'SUCCESS') {
      const refundedToWallet = await creditRefundToWallet(
        client,
        t.user_id,
        Number(t.amount),
        t.id,
        `Hoàn tiền vé xe #${t.id}`
      );
      if (refundedToWallet) {
        await client.query("UPDATE payment_transactions SET status='REFUNDED' WHERE ticket_id=$1", [t.id]);
      } else {
        await enqueueRefund(client, t.id);
      }
    }

    await client.query("UPDATE tickets SET status='CANCELLED' WHERE id=$1", [t.id]);
    await client.query(
      `UPDATE trip_seats SET status='AVAILABLE',ticket_id=NULL,locked_at=NULL,lock_expires_at=NULL,locked_by_user_id=NULL,redis_lock_id=NULL WHERE ticket_id=$1`,
      [t.id]
    );
    if (t.ticket_status === 'BOOKED')
      await client.query('UPDATE trips SET booked_seats=GREATEST(booked_seats-$2,0) WHERE id=$1', [
        t.trip_id,
        t.quantity,
      ]);
    await client.query('DELETE FROM ticket_requests WHERE ticket_id=$1', [t.id]);
    return t;
  });
  await releaseSeatLock(
    ticket.trip_id,
    ticket.seat_number,
    ticket.redis_lock_id || undefined
  ).catch(() => {});

  if (ticket.payment_status === 'SUCCESS') {
    await processRefundJobs(1, ticket.id).catch(() => {});
  }
  return { refundAmount: ticket.payment_status === 'SUCCESS' ? Number(ticket.amount) : 0 };
}

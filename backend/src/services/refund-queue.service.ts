import { query, transaction } from '../config/database';
import { PoolClient } from 'pg';
import { PaymentRefundService } from './payment-refund.service';
export async function enqueueRefund(client: PoolClient, ticketId: string) {
  const {
    rows: [p],
  } = await client.query(
    `UPDATE payment_transactions SET refund_request_id=COALESCE(refund_request_id,$1) WHERE ticket_id=$2 AND status='SUCCESS' RETURNING refund_request_id`,
    [ticketId, ticketId]
  );
  if (p)
    await client.query(
      `INSERT INTO refund_jobs(ticket_id,request_id) VALUES($1,$2) ON CONFLICT(ticket_id) DO NOTHING`,
      [ticketId, p.refund_request_id]
    );
}
export async function processRefundJobs(limit = 10, ticketId?: string) {
  let completed = 0;
  for (let i = 0; i < limit; i++) {
    const job = await transaction(async client => {
      const {
        rows: [row],
      } = await client.query(
        `SELECT * FROM refund_jobs WHERE status<>'done' AND next_attempt_at<=NOW() AND (leased_until IS NULL OR leased_until<NOW()) AND ($1::text IS NULL OR ticket_id=$1) ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED`,
        [ticketId ?? null]
      );
      if (!row) return null;
      await client.query(
        "UPDATE refund_jobs SET status='processing',attempts=attempts+1,leased_until=NOW()+INTERVAL '60 seconds' WHERE ticket_id=$1",
        [row.ticket_id]
      );
      return row;
    });
    if (!job) break;
    try {
      const [payment] = await query<any[]>(
        'SELECT * FROM payment_transactions WHERE ticket_id=$1',
        [job.ticket_id]
      );
      if (!payment) throw new Error('Không tìm thấy giao dịch hoàn.');
      if (payment.status !== 'REFUNDED') {
        if (payment.status !== 'SUCCESS') throw new Error('Giao dịch chưa xác nhận thu tiền.');
        await new PaymentRefundService().refund({
          paymentMethod: payment.payment_method,
          amount: Math.round(Number(payment.amount)),
          gatewayTransactionId: payment.gateway_transaction_id,
          refundRequestId: job.request_id,
          paidAt: payment.paid_at ? new Date(payment.paid_at) : null,
          bookingCode: payment.order_id,
        });
      }
      await transaction(async client => {
        await client.query(
          "UPDATE payment_transactions SET status='REFUNDED' WHERE ticket_id=$1 AND status='SUCCESS'",
          [job.ticket_id]
        );
        await client.query(
          "UPDATE refund_jobs SET status='done',leased_until=NULL,last_error=NULL WHERE ticket_id=$1",
          [job.ticket_id]
        );
      });
      completed++;
    } catch (error) {
      const seconds = Math.min(3600, 30 * Math.pow(2, Math.min(job.attempts, 7)));
      await query(
        "UPDATE refund_jobs SET status='pending',leased_until=NULL,last_error=$2,next_attempt_at=NOW()+$3*INTERVAL '1 second' WHERE ticket_id=$1",
        [
          job.ticket_id,
          error instanceof Error ? error.message.slice(0, 300) : 'Provider unavailable',
          seconds,
        ]
      );
    }
  }
  return completed;
}

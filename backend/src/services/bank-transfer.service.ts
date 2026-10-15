import { PoolClient } from 'pg';
import { query, transaction } from '../config/database';
import { techcombankBeneficiary, bankTransferDto } from './bank-transfer-qr';
import { applyTicketPayment } from './ticket-payment.service';
import { creditRefundToWallet, validateAmount } from './wallet.service';
import { deliverTicketEmail } from './ticket-email.service';
import { appLogger } from '../config/logger';
const fail = (message: string, status = 400): never => {
  throw Object.assign(new Error(message), { status });
};

export async function createBankTransfer(client: PoolClient, ticketId: string, bookingId: string) {
  await client.query(
    `INSERT INTO bank_transfer_payments(ticket_id,booking_id,reference,bank_bin,bank_name,account_number,account_holder)
     VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(ticket_id) DO NOTHING`,
    [
      ticketId,
      bookingId,
      'SB' + ticketId.replace(/-/g, '').slice(0, 22).toUpperCase(),
      techcombankBeneficiary.bankBin,
      techcombankBeneficiary.bankName,
      techcombankBeneficiary.accountNumber,
      techcombankBeneficiary.accountHolder,
    ]
  );
}
export async function transferForBooking(userId: string, bookingId: string, ticketId?: string) {
  const [row] = await query<any[]>(
    `SELECT bt.*,p.amount,t.reservation_expires_at FROM bank_transfer_payments bt
     JOIN payment_transactions p ON p.ticket_id=bt.ticket_id JOIN tickets t ON t.id=bt.ticket_id
     JOIN ui_bookings b ON b.id=bt.booking_id JOIN ui_holds h ON h.id=b.hold_id
     WHERE b.id=$1 AND h.user_id=$2 AND bt.ticket_id=COALESCE($3::text,b.ticket_id)`,
    [bookingId, userId, ticketId || null]
  );
  if (!row) fail('Không tìm thấy giao dịch chuyển khoản.', 404);
  return bankTransferDto(row, Number(row.amount), row.reservation_expires_at);
}
export async function submitTransfer(userId: string, ticketId: string, reference: unknown) {
  const senderReference = typeof reference === 'string' ? reference.trim() : '';
  if (senderReference.length > 150) fail('Mã giao dịch người gửi tối đa 150 ký tự.');
  const [row] = await query<any[]>(
    `UPDATE bank_transfer_payments bt SET status='SUBMITTED',submitted_at=COALESCE(submitted_at,NOW()),sender_reference=$3
     FROM tickets t WHERE bt.ticket_id=t.id AND t.user_id=$1 AND t.id=$2 AND bt.status IN ('PENDING','SUBMITTED') RETURNING bt.booking_id`,
    [userId, ticketId, senderReference]
  );
  if (!row) fail('Giao dịch không tồn tại hoặc đã được xử lý.', 409);
  return transferForBooking(userId, row.booking_id, ticketId);
}
export async function listTransfers() {
  return query(
    `SELECT bt.*,p.amount,p.status AS payment_status,t.user_id,t.status AS ticket_status,
     t.reservation_expires_at,u.full_name AS customer_name,r.name AS route_name,tr.departure_time
     FROM bank_transfer_payments bt JOIN payment_transactions p ON p.ticket_id=bt.ticket_id
     JOIN tickets t ON t.id=bt.ticket_id JOIN users u ON u.id=t.user_id JOIN trips tr ON tr.id=t.trip_id JOIN routes r ON r.id=tr.route_id
     ORDER BY (bt.status='SUBMITTED') DESC,(bt.status='PENDING') DESC,bt.created_at DESC LIMIT 100`
  );
}
async function releaseTransferSeats(client: PoolClient, ticketId: string) {
  await client.query(
    `UPDATE ui_holds h SET status='released' FROM ui_bookings b WHERE b.hold_id=h.id AND b.ticket_id=$1 AND h.status='active'`,
    [ticketId]
  );
  await client.query(
    "UPDATE tickets SET status='CANCELLED',reservation_expires_at=NULL WHERE id=$1 AND status='RESERVED'",
    [ticketId]
  );
  await client.query(
    `UPDATE trip_seats SET status='AVAILABLE',ticket_id=NULL,locked_at=NULL,lock_expires_at=NULL,locked_by_user_id=NULL,redis_lock_id=NULL WHERE ticket_id=$1 AND status='LOCKED'`,
    [ticketId]
  );
}
export async function reviewTransfer(actor: string, ticketId: string, data: any) {
  const note = typeof data.note === 'string' ? data.note.trim() : '';
  const bankId =
    data.action === 'CONFIRM' && typeof data.bankTransactionId === 'string'
      ? data.bankTransactionId.trim().toUpperCase()
      : '';
  if (!['CONFIRM', 'REJECT'].includes(data.action) || note.length > 500)
    fail('Yêu cầu đối soát không hợp lệ.');
  if (data.action === 'CONFIRM') {
    validateAmount(data.receivedAmount, 1);
    if (bankId.length < 3 || bankId.length > 150) fail('Nhập mã giao dịch báo có tại ngân hàng.');
  } else if (note.length < 5) fail('Nhập lý do từ chối ít nhất 5 ký tự.');
  const result = await transaction(async client => {
    const {
      rows: [payment],
    } = await client.query(
      `SELECT p.*,t.user_id,t.trip_id,t.status AS ticket_status,tr.status AS trip_status,tr.departure_time,tr.archived_at
       FROM payment_transactions p JOIN tickets t ON t.id=p.ticket_id JOIN trips tr ON tr.id=t.trip_id WHERE p.ticket_id=$1 FOR UPDATE OF p,t`,
      [ticketId]
    );
    const {
      rows: [transfer],
    } = await client.query('SELECT * FROM bank_transfer_payments WHERE ticket_id=$1 FOR UPDATE', [
      ticketId,
    ]);
    if (!payment || !transfer || payment.payment_method !== 'BANK_TRANSFER')
      fail('Không tìm thấy chuyển khoản.', 404);
    if (payment.user_id === actor) fail('Không thể tự duyệt chuyển khoản của mình.', 403);
    if (
      ['CONFIRMED', 'REFUNDED'].includes(transfer.status) ||
      (transfer.status === 'REJECTED' && data.action === 'REJECT')
    ) {
      if (
        data.action === 'CONFIRM' &&
        transfer.bank_transaction_id === bankId &&
        transfer.received_amount === data.receivedAmount
      )
        return { status: transfer.status, bookingId: transfer.booking_id };
      if (data.action === 'REJECT' && transfer.status === 'REJECTED')
        return { status: 'REJECTED', bookingId: transfer.booking_id };
      fail('Chuyển khoản đã được xử lý.', 409);
    }
    let status = 'REJECTED';
    if (data.action === 'CONFIRM') {
      const forceLate =
        Number(payment.amount) !== data.receivedAmount ||
        payment.trip_status !== 'SCHEDULED' ||
        !!payment.archived_at ||
        new Date(payment.departure_time).getTime() <= Date.now();
      const outcome = await applyTicketPayment(
        client,
        ticketId,
        'BANK_TRANSFER',
        bankId,
        Number(payment.amount),
        forceLate
      );
      if (outcome === 'INVALID' || outcome === 'REFUNDED')
        fail('Trạng thái giao dịch không thể đối soát.', 409);
      if (outcome === 'LATE') {
        await creditRefundToWallet(
          client,
          payment.user_id,
          data.receivedAmount,
          'bank-transfer:' + ticketId,
          'Chuyển khoản đến muộn hoặc lệch số tiền · ' + transfer.reference
        );
        await client.query(
          "UPDATE payment_transactions SET amount=$2,status='REFUNDED' WHERE ticket_id=$1",
          [ticketId, data.receivedAmount]
        );
        await releaseTransferSeats(client, ticketId);
        status = 'REFUNDED';
      } else status = 'CONFIRMED';
    } else {
      await client.query(
        "UPDATE payment_transactions SET status='FAILED' WHERE ticket_id=$1 AND status='PENDING'",
        [ticketId]
      );
      await releaseTransferSeats(client, ticketId);
    }
    await client.query(
      `UPDATE bank_transfer_payments SET status=$2,bank_transaction_id=$3,received_amount=$4,reviewed_by=$5,reviewed_at=NOW(),review_note=$6 WHERE ticket_id=$1`,
      [
        ticketId,
        status,
        bankId || null,
        data.action === 'CONFIRM' ? data.receivedAmount : null,
        actor,
        note,
      ]
    );
    await client.query(
      `INSERT INTO notifications(user_id,type,title,body,data) VALUES($1,'PAYMENT','Kết quả đối soát chuyển khoản',$2,$3::jsonb)`,
      [
        payment.user_id,
        status === 'CONFIRMED'
          ? 'Đã nhận tiền và phát hành vé.'
          : status === 'REFUNDED'
            ? 'Tiền đã vào ví do ghế hết hạn, đơn đã đổi hoặc số tiền không khớp. Chưa phát hành vé mới.'
            : 'Chưa xác nhận nhận tiền: ' + note,
        JSON.stringify({
          link: status === 'REFUNDED' ? '/account/wallet' : '/account/tickets',
          bookingId: transfer.booking_id,
        }),
      ]
    );
    return { status, bookingId: transfer.booking_id };
  });
  if (result.status === 'CONFIRMED')
    await deliverTicketEmail(ticketId).catch(error =>
      appLogger.error('bank_transfer_ticket_email_retry', { ticket_id: ticketId, error })
    );
  return result;
}

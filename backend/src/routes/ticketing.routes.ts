import { randomUUID } from 'crypto';
import { Request, Response, Router } from 'express';
import { dbPool, query, transaction } from '../config/database';
import { getSeatsByTrip } from '../controllers/seats.controller';
import { AuthenticatedRequest, authenticateJWT } from '../middlewares/auth';
import { authorizeRoles } from '../middlewares/rbac';
import { acquireSeatLock, releaseSeatLock } from '../config/redis';
import { PaymentGatewayService, OnlinePaymentMethod } from '../services/payment-gateway.service';
import { BookingError, bookSeat, reserveSeatForPayment } from '../services/booking';
import { PaymentRefundError, PaymentRefundService } from '../services/payment-refund.service';

const router = Router();
const gateway = new PaymentGatewayService();
const refunds = new PaymentRefundService();

function clientIp(req: Request): string {
  const configured = process.env.PAYMENT_CLIENT_IP?.trim();
  if (configured) return configured;
  const ip = req.ip?.replace(/^::ffff:/, '') || '127.0.0.1';
  return ip.includes(':') ? '127.0.0.1' : ip;
}

function stringQuery(params: Request['query']): Record<string, string> {
  return Object.fromEntries(
    Object.entries(params).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string'
    )
  );
}

async function confirmPayment(
  orderId: string,
  method: OnlinePaymentMethod,
  gatewayTransactionId: string,
  amount: number
): Promise<'CONFIRMED' | 'LATE' | 'REFUNDED' | 'INVALID'> {
  return transaction(async client => {
    const {
      rows: [payment],
    } = await client.query(
      `SELECT p.ticket_id,p.amount,p.status,p.payment_method,p.redis_lock_id,
              t.status AS ticket_status,t.trip_id,t.seat_number,t.user_id,t.ticket_code,
              t.reservation_expires_at
       FROM payment_transactions p JOIN tickets t ON t.id=p.ticket_id
       WHERE p.order_id=$1 FOR UPDATE OF p,t`,
      [orderId]
    );
    if (!payment || payment.payment_method !== method || Number(payment.amount) !== amount)
      return 'INVALID';
    if (payment.status === 'REFUNDED') return 'REFUNDED';
    if (payment.status === 'SUCCESS') {
      return payment.ticket_status === 'BOOKED' ? 'CONFIRMED' : 'LATE';
    }
    if (!['PENDING', 'FAILED'].includes(payment.status)) return 'INVALID';

    const expired =
      payment.ticket_status !== 'RESERVED' ||
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
       WHERE id=$1 AND status='RESERVED'`,
      [payment.ticket_id]
    );
    await client.query(
      `UPDATE trip_seats SET status='BOOKED',locked_at=NULL,lock_expires_at=NULL,
       locked_by_user_id=NULL,redis_lock_id=NULL WHERE ticket_id=$1`,
      [payment.ticket_id]
    );
    await client.query('UPDATE trips SET booked_seats=booked_seats+1 WHERE id=$1', [
      payment.trip_id,
    ]);
    return 'CONFIRMED';
  });
}

async function refundLatePayment(orderId: string): Promise<void> {
  const requestId = randomUUID();
  const rows = await query<any[]>(
    `UPDATE payment_transactions
     SET refund_request_id=COALESCE(refund_request_id,$1)
     WHERE order_id=$2 AND status='SUCCESS'
     RETURNING payment_method,amount,gateway_transaction_id,refund_request_id,paid_at`,
    [requestId, orderId]
  );
  const payment = rows[0];
  if (!payment) throw new Error('Không tìm thấy giao dịch cần hoàn tiền.');
  if (payment.refund_request_id) {
    await refunds.refund({
      paymentMethod: payment.payment_method,
      amount: Math.round(Number(payment.amount)),
      gatewayTransactionId: payment.gateway_transaction_id,
      refundRequestId: payment.refund_request_id,
      paidAt: payment.paid_at ? new Date(payment.paid_at) : null,
      bookingCode: orderId,
    });
  }
  await query(
    "UPDATE payment_transactions SET status='REFUNDED' WHERE order_id=$1 AND status='SUCCESS'",
    [orderId]
  );
}

async function recordFailedPayment(orderId: string, method: OnlinePaymentMethod): Promise<void> {
  const releasedSeat = await transaction(async client => {
    const {
      rows: [payment],
    } = await client.query(
      `SELECT p.ticket_id,p.redis_lock_id,t.trip_id,t.seat_number
       FROM payment_transactions p JOIN tickets t ON t.id=p.ticket_id
       WHERE p.order_id=$1 AND p.payment_method=$2 AND p.status='PENDING'
       FOR UPDATE OF p,t`,
      [orderId, method]
    );
    if (!payment) return null;
    await client.query(
      "UPDATE payment_transactions SET status='FAILED' WHERE order_id=$1 AND status='PENDING'",
      [orderId]
    );
    await client.query(
      `UPDATE tickets SET status='CANCELLED',reservation_expires_at=NULL
       WHERE id=$1 AND status='RESERVED'`,
      [payment.ticket_id]
    );
    await client.query(
      `UPDATE trip_seats SET status='AVAILABLE',ticket_id=NULL,locked_at=NULL,
       lock_expires_at=NULL,locked_by_user_id=NULL,redis_lock_id=NULL
       WHERE ticket_id=$1`,
      [payment.ticket_id]
    );
    return payment;
  });
  if (releasedSeat) {
    await releaseSeatLock(
      releasedSeat.trip_id,
      releasedSeat.seat_number,
      releasedSeat.redis_lock_id || undefined
    );
  }
}

async function handleVnpayCallback(req: Request, res: Response, redirect: boolean): Promise<void> {
  const params = stringQuery(req.query);
  const orderId = params.vnp_TxnRef;
  try {
    if (!gateway.verifyVnpayCallback(params) || !orderId) {
      throw new Error('Chữ ký hoặc mã đơn VNPay không hợp lệ.');
    }
    if (params.vnp_ResponseCode !== '00' || params.vnp_TransactionStatus !== '00') {
      await recordFailedPayment(orderId, 'VNPAY');
      if (redirect) {
        const target = new URL(
          process.env.PAYMENT_RESULT_URL || 'http://localhost:3000/passenger/booking'
        );
        target.searchParams.set('paymentOrder', orderId);
        target.searchParams.set('paymentResult', 'failed');
        res.redirect(target.toString());
      } else {
        res.status(200).json({ RspCode: '00', Message: 'Payment failed status recorded' });
      }
      return;
    }
    if (!params.vnp_TransactionNo) throw new Error('Thiếu mã giao dịch VNPay.');
    const result = await confirmPayment(
      orderId,
      'VNPAY',
      params.vnp_TransactionNo,
      Number(params.vnp_Amount) / 100
    );
    if (result === 'INVALID') throw new Error('Giao dịch VNPay không hợp lệ.');
    if (result === 'LATE') await refundLatePayment(orderId);

    if (redirect) {
      const target = new URL(
        process.env.PAYMENT_RESULT_URL || 'http://localhost:3000/passenger/booking'
      );
      target.searchParams.set('paymentOrder', orderId);
      target.searchParams.set('paymentResult', result === 'CONFIRMED' ? 'success' : 'failed');
      res.redirect(target.toString());
    } else {
      res
        .status(200)
        .json({ RspCode: '00', Message: result === 'LATE' ? 'Late payment refunded' : 'Success' });
    }
  } catch (error) {
    console.error('[VNPay] Callback could not be confirmed:', error);
    if (redirect) {
      const target = new URL(
        process.env.PAYMENT_RESULT_URL || 'http://localhost:3000/passenger/booking'
      );
      if (orderId) target.searchParams.set('paymentOrder', orderId);
      target.searchParams.set('paymentResult', 'failed');
      res.redirect(target.toString());
    } else {
      res.status(200).json({ RspCode: '99', Message: 'Payment confirmation failed' });
    }
  }
}

export async function releaseExpiredReservations(): Promise<number> {
  const expired = await query<any[]>(
    `SELECT t.id,t.trip_id,t.seat_number,p.redis_lock_id
     FROM tickets t JOIN payment_transactions p ON p.ticket_id=t.id
     WHERE t.status='RESERVED' AND p.status='PENDING'
       AND t.reservation_expires_at <= NOW()
     ORDER BY t.reservation_expires_at LIMIT 100`
  );
  let releasedCount = 0;
  for (const ticket of expired) {
    const released = await transaction(async client => {
      const {
        rows: [current],
      } = await client.query(
        `SELECT t.id FROM tickets t JOIN payment_transactions p ON p.ticket_id=t.id
         WHERE t.id=$1 AND t.status='RESERVED' AND p.status='PENDING'
           AND t.reservation_expires_at <= NOW() FOR UPDATE OF t,p`,
        [ticket.id]
      );
      if (!current) return false;
      await client.query(
        "UPDATE tickets SET status='CANCELLED',reservation_expires_at=NULL WHERE id=$1",
        [ticket.id]
      );
      await client.query(
        "UPDATE payment_transactions SET status='FAILED' WHERE ticket_id=$1 AND status='PENDING'",
        [ticket.id]
      );
      await client.query(
        `UPDATE trip_seats SET status='AVAILABLE',ticket_id=NULL,locked_at=NULL,
         lock_expires_at=NULL,locked_by_user_id=NULL,redis_lock_id=NULL WHERE ticket_id=$1`,
        [ticket.id]
      );
      return true;
    });
    if (released) {
      releasedCount += 1;
      await releaseSeatLock(ticket.trip_id, ticket.seat_number, ticket.redis_lock_id || undefined);
    }
  }
  return releasedCount;
}

router.get('/trips/:tripId/seats', getSeatsByTrip);

router.post(
  '/bookings',
  authenticateJWT,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { tripId, seatNumber, paymentMethod } = req.body;
    const userId = req.user!.id;
    if (!tripId || typeof seatNumber !== 'string' || !seatNumber.trim()) {
      res.status(400).json({ success: false, message: 'Vui lòng chọn chuyến xe và ghế.' });
      return;
    }
    if (paymentMethod !== undefined && !['VNPAY', 'MOMO'].includes(paymentMethod)) {
      res.status(400).json({ success: false, message: 'Chỉ hỗ trợ thanh toán VNPay hoặc MoMo.' });
      return;
    }

    let lockId: string | null;
    try {
      lockId = await acquireSeatLock(String(tripId), seatNumber, userId);
    } catch (error) {
      console.error('[Redis] Could not acquire seat lock:', error);
      res.status(503).json({ success: false, message: 'Dịch vụ giữ ghế tạm thời không khả dụng.' });
      return;
    }
    if (!lockId) {
      res.status(409).json({ success: false, message: 'Ghế đang được người khác giữ.' });
      return;
    }
    let reservationTicketId: string | undefined;
    let keepReservationLock = false;
    try {
      if (!paymentMethod) {
        const ticket = await bookSeat(String(tripId), seatNumber, userId);
        const qrCode = `SMARTBUS-QR-${ticket.ticket_code}`;
        const data = {
          ticket,
          qrCode,
          qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrCode)}`,
          ticketId: ticket.id,
          ticketCode: ticket.ticket_code,
          seatNumber: ticket.seat_number,
          fareAmount: Number(ticket.fare_amount),
          status: ticket.status,
        };
        res.status(201).json({ success: true, message: 'Đặt vé thành công!', data, ...data });
        return;
      }

      const ticket = await reserveSeatForPayment(
        String(tripId),
        seatNumber,
        userId,
        paymentMethod as OnlinePaymentMethod,
        lockId
      );
      reservationTicketId = ticket.id;
      const paymentUrl = await gateway.createPaymentUrl(
        paymentMethod as OnlinePaymentMethod,
        ticket.id,
        Number(ticket.fare_amount),
        clientIp(req)
      );
      const data = {
        booking: {
          id: ticket.id,
          bookingCode: ticket.id,
          status: 'PENDING',
          totalAmount: Number(ticket.fare_amount),
        },
        ticket: {
          id: ticket.id,
          ticketCode: ticket.ticket_code,
          seatNumber: ticket.seat_number,
          fareAmount: Number(ticket.fare_amount),
          status: 'RESERVED',
          reservationExpiresAt: ticket.reservation_expires_at,
        },
        payment: {
          orderId: ticket.id,
          amount: Number(ticket.fare_amount),
          method: paymentMethod,
          status: 'PENDING',
          paymentUrl,
        },
        paymentUrl,
        ticketId: ticket.id,
        ticketCode: ticket.ticket_code,
        seatNumber: ticket.seat_number,
        fareAmount: Number(ticket.fare_amount),
        status: 'RESERVED',
      };
      res.status(201).json({
        success: true,
        message: 'Đã giữ ghế. Hoàn tất thanh toán trong 10 phút.',
        data,
        ...data,
      });
      keepReservationLock = true;
    } catch (error: any) {
      if (reservationTicketId) {
        await transaction(async client => {
          await client.query(
            "UPDATE payment_transactions SET status='FAILED' WHERE ticket_id=$1 AND status='PENDING'",
            [reservationTicketId]
          );
          await client.query(
            "UPDATE tickets SET status='CANCELLED',reservation_expires_at=NULL WHERE id=$1 AND status='RESERVED'",
            [reservationTicketId]
          );
          await client.query(
            `UPDATE trip_seats SET status='AVAILABLE',ticket_id=NULL,locked_at=NULL,
           lock_expires_at=NULL,locked_by_user_id=NULL,redis_lock_id=NULL WHERE ticket_id=$1`,
            [reservationTicketId]
          );
        }).catch(cleanupError =>
          console.error('[Payments] Reservation rollback failed:', cleanupError)
        );
        await releaseSeatLock(String(tripId), seatNumber, lockId);
      }
      console.error('[Ticketing] Booking failed:', error);
      const status =
        error instanceof BookingError ? error.status : error.code === '23505' ? 409 : 502;
      res.status(status).json({ success: false, message: error.message || 'Không thể đặt vé.' });
    } finally {
      if (!keepReservationLock) {
        await releaseSeatLock(String(tripId), seatNumber, lockId);
      }
    }
  }
);

router.get('/payments/vnpay/ipn', (req, res) => {
  void handleVnpayCallback(req, res, false);
});
router.get('/payments/vnpay/return', (req, res) => {
  void handleVnpayCallback(req, res, true);
});
router.post('/payments/momo/ipn', async (req: Request, res: Response): Promise<void> => {
  const payload = req.body as Record<string, unknown>;
  try {
    if (
      !gateway.verifyMomoCallback(payload) ||
      typeof payload.orderId !== 'string' ||
      !Number.isFinite(Number(payload.amount)) ||
      !Number.isSafeInteger(Number(payload.transId)) ||
      Number(payload.transId) <= 0
    ) {
      res.status(400).json({ resultCode: 97, message: 'Invalid payment notification.' });
      return;
    }
    if (Number(payload.resultCode) !== 0) {
      await recordFailedPayment(payload.orderId, 'MOMO');
      res.status(200).json({ resultCode: 0, message: 'Unsuccessful payment recorded' });
      return;
    }
    const result = await confirmPayment(
      payload.orderId,
      'MOMO',
      String(payload.transId),
      Number(payload.amount)
    );
    if (result === 'INVALID') {
      res.status(400).json({ resultCode: 99, message: 'Payment transaction was not found.' });
      return;
    }
    if (result === 'LATE') await refundLatePayment(payload.orderId);
    res
      .status(200)
      .json({ resultCode: 0, message: result === 'LATE' ? 'Late payment refunded' : 'Success' });
  } catch (error) {
    console.error('[MoMo] IPN could not be confirmed:', error);
    res.status(500).json({ resultCode: 99, message: 'Payment confirmation failed.' });
  }
});

router.get(
  '/payments/:orderId',
  authenticateJWT,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const rows = await query<any[]>(
        `SELECT p.order_id,p.payment_method,p.amount,p.status,p.paid_at,t.id AS ticket_id,
              t.ticket_code,t.seat_number,t.trip_id,t.status AS ticket_status,t.user_id
       FROM payment_transactions p JOIN tickets t ON t.id=p.ticket_id WHERE p.order_id=$1`,
        [req.params.orderId]
      );
      const payment = rows[0];
      if (!payment) {
        res.status(404).json({ success: false, message: 'Không tìm thấy giao dịch.' });
        return;
      }
      if (req.user?.role !== 'ADMIN' && payment.user_id !== req.user?.id) {
        res.status(403).json({ success: false, message: 'Bạn không có quyền xem giao dịch này.' });
        return;
      }
      res.json({
        success: true,
        data: {
          orderId: payment.order_id,
          paymentMethod: payment.payment_method,
          amount: Number(payment.amount),
          paymentStatus: payment.status,
          paidAt: payment.paid_at,
          ticket: {
            id: payment.ticket_id,
            ticketCode: payment.ticket_code,
            seatNumber: payment.seat_number,
            tripId: payment.trip_id,
            status: payment.ticket_status,
          },
        },
      });
    } catch (error) {
      console.error('[Payments] Status lookup failed:', error);
      res
        .status(500)
        .json({ success: false, message: 'Không thể kiểm tra trạng thái thanh toán.' });
    }
  }
);

router.post(
  '/tickets/:id/cancel',
  authenticateJWT,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const {
        rows: [ticket],
      } = await dbPool.query(
        `SELECT t.id,t.trip_id,t.user_id,t.seat_number,t.status AS ticket_status,
              p.order_id,p.payment_method,p.amount,p.status AS payment_status,
              p.gateway_transaction_id,p.refund_request_id,p.paid_at,p.redis_lock_id
       FROM tickets t LEFT JOIN payment_transactions p ON p.ticket_id=t.id WHERE t.id=$1`,
        [req.params.id]
      );
      if (!ticket) {
        res.status(404).json({ success: false, message: 'Không tìm thấy vé.' });
        return;
      }
      if (req.user?.role !== 'ADMIN' && ticket.user_id !== req.user?.id) {
        res.status(403).json({ success: false, message: 'Bạn không có quyền hủy vé này.' });
        return;
      }
      if (ticket.ticket_status === 'CHECKED_IN') {
        res.status(400).json({ success: false, message: 'Vé đã soát, không thể hủy.' });
        return;
      }
      if (ticket.ticket_status === 'CANCELLED') {
        res.status(409).json({ success: false, message: 'Vé đã được hủy.' });
        return;
      }
      if (ticket.payment_status === 'PENDING') {
        res.status(409).json({ success: false, message: 'Thanh toán đang chờ xác nhận.' });
        return;
      }
      if (ticket.payment_status === 'SUCCESS') {
        const refundRequestId = ticket.refund_request_id || randomUUID();
        await query(
          `UPDATE payment_transactions SET refund_request_id=COALESCE(refund_request_id,$1)
         WHERE order_id=$2 AND status='SUCCESS'`,
          [refundRequestId, ticket.order_id]
        );
        const rows = await query<any[]>(
          `SELECT refund_request_id FROM payment_transactions WHERE order_id=$1`,
          [ticket.order_id]
        );
        await refunds.refund({
          paymentMethod: ticket.payment_method,
          amount: Math.round(Number(ticket.amount)),
          gatewayTransactionId: ticket.gateway_transaction_id,
          refundRequestId: rows[0].refund_request_id,
          paidAt: ticket.paid_at ? new Date(ticket.paid_at) : null,
          bookingCode: ticket.order_id,
        });
      }
      await transaction(async client => {
        if (ticket.payment_status === 'SUCCESS') {
          await client.query(
            "UPDATE payment_transactions SET status='REFUNDED' WHERE order_id=$1 AND status='SUCCESS'",
            [ticket.order_id]
          );
        }
        const { rowCount } = await client.query(
          "UPDATE tickets SET status='CANCELLED' WHERE id=$1 AND status IN ('RESERVED','BOOKED')",
          [ticket.id]
        );
        if (rowCount) {
          await client.query(
            `UPDATE trip_seats SET status='AVAILABLE',ticket_id=NULL,locked_at=NULL,
           lock_expires_at=NULL,locked_by_user_id=NULL,redis_lock_id=NULL WHERE ticket_id=$1`,
            [ticket.id]
          );
          if (ticket.ticket_status === 'BOOKED') {
            await client.query(
              'UPDATE trips SET booked_seats=GREATEST(booked_seats-1,0) WHERE id=$1',
              [ticket.trip_id]
            );
          }
        }
      });
      await releaseSeatLock(ticket.trip_id, ticket.seat_number, ticket.redis_lock_id || undefined);
      res.json({
        success: true,
        message: 'Đã hủy vé và xử lý hoàn tiền nếu giao dịch đã thanh toán.',
        refundAmount: ticket.payment_status === 'SUCCESS' ? Number(ticket.amount) : 0,
      });
    } catch (error: any) {
      console.error('[Ticketing] Cancellation failed:', error);
      res.status(error instanceof PaymentRefundError ? error.statusCode : 500).json({
        success: false,
        message: error.message || 'Không thể hủy vé.',
      });
    }
  }
);

async function releaseExpiredHandler(req: Request, res: Response): Promise<void> {
  const secrets = [process.env.PAYMENT_CRON_SECRET, process.env.CRON_SECRET]
    .map(secret => secret?.trim())
    .filter((secret): secret is string => Boolean(secret));
  const authorization = req.headers.authorization;
  if (secrets.length && !secrets.some(secret => authorization === `Bearer ${secret}`)) {
    res.status(401).json({ success: false, message: 'Unauthorized.' });
    return;
  }
  if (!secrets.length && process.env.NODE_ENV === 'production') {
    res.status(503).json({ success: false, message: 'PAYMENT_CRON_SECRET must be configured.' });
    return;
  }
  try {
    const affectedRows = await releaseExpiredReservations();
    res.json({ success: true, affectedRows });
  } catch (error) {
    console.error('[Ticketing] Expiry cleanup failed:', error);
    res.status(500).json({ success: false, message: 'Không thể giải phóng ghế quá hạn.' });
  }
}

router.post('/release-expired', releaseExpiredHandler);
router.get('/release-expired', releaseExpiredHandler);

router.post(
  '/verify',
  authenticateJWT,
  authorizeRoles('ADMIN', 'MANAGER', 'DRIVER'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (typeof req.body.code !== 'string' || !req.body.code.trim()) {
        res.status(400).json({ success: false, message: 'Vui lòng cung cấp mã vé.' });
        return;
      }
      const code = req.body.code.trim().replace(/^SMARTBUS-QR-/, '');
      const result = await transaction(async client => {
        const {
          rows: [ticket],
        } = await client.query(
          `SELECT t.*,u.full_name,u.email,r.name AS route_name,r.code AS route_code
         FROM tickets t LEFT JOIN users u ON u.id=t.user_id
         JOIN trips tr ON tr.id=t.trip_id JOIN routes r ON r.id=tr.route_id
         WHERE t.ticket_code=$1 OR t.id=$1 FOR UPDATE OF t`,
          [code]
        );
        if (!ticket) throw new BookingError(404, 'Không tìm thấy vé.');
        if (!['BOOKED', 'CHECKED_IN'].includes(ticket.status))
          throw new BookingError(409, 'Vé không còn hiệu lực.');
        const isAlreadyCheckedIn = ticket.status === 'CHECKED_IN';
        if (!isAlreadyCheckedIn) {
          await client.query("UPDATE tickets SET status='CHECKED_IN' WHERE id=$1", [ticket.id]);
          await client.query("UPDATE trip_seats SET status='CHECKED_IN' WHERE ticket_id=$1", [
            ticket.id,
          ]);
        }
        return {
          isAlreadyCheckedIn,
          ticket: {
            id: ticket.id,
            ticketCode: ticket.ticket_code,
            seatNumber: ticket.seat_number,
            fareAmount: Number(ticket.fare_amount),
            status: 'CHECKED_IN',
            user: { fullName: ticket.full_name, email: ticket.email },
            trip: { route: { name: ticket.route_name, code: ticket.route_code } },
          },
        };
      });
      res.json({ success: true, ...result });
    } catch (error: any) {
      res
        .status(error.status || 500)
        .json({ success: false, message: error.message || 'Không thể soát vé.' });
    }
  }
);

export default router;

import { randomUUID } from 'crypto';
import { Router, Response, RequestHandler } from 'express';
import { query, transaction } from '../config/database';
import { AuthenticatedRequest, authenticateJWT } from '../middlewares/auth';
import { getMe } from '../controllers/auth.controller';
import authRoutes from './auth.routes';
import { cancelTicket } from '../services/cancellation.service';
import { prepareSeats, reserveSeatForPayment } from '../services/booking';
import { PaymentGatewayService } from '../services/payment-gateway.service';
import { buildQrPayload, validateTicketQr } from '../services/ticket.service';
import { assertTripAccess } from '../services/trip-access.service';
import { updateTripLocation } from '../services/location-update.service';
import { appLogger } from '../config/logger';
import bcrypt from 'bcrypt';
import { sendEmail } from '../services/email.service';
import { assertEmailVerified } from '../services/email-verification.service';
import {
  createNotification,
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../services/notification.service';

const router = Router();
const logger = appLogger.child('ui-api');
const gateway = new PaymentGatewayService();
const fail = (message: string, status = 400): never => {
  throw Object.assign(new Error(message), { status });
};
const api =
  (fn: (req: AuthenticatedRequest, res: Response) => Promise<any>): RequestHandler =>
  async (req, res) => {
    try {
      const result = await fn(req, res);
      if (!res.headersSent) res.json(result);
    } catch (error: any) {
      logger.error('request_failed', { path: req.path, error });
      if (!res.headersSent)
        res.status(error.status || (['23505', '23503'].includes(error.code) ? 409 : 500)).json({
          success: false,
          message: error.status
            ? error.message
            : ['23505', '23503'].includes(error.code)
              ? 'Dữ liệu đang được sử dụng hoặc yêu cầu đã tồn tại.'
              : 'Không thể xử lý yêu cầu.',
        });
    }
  };
const roles = (req: AuthenticatedRequest, allowed = ['ADMIN', 'MANAGER']) => {
  if (!allowed.includes(req.user?.role ?? '')) fail('Không có quyền.', 403);
};
const audit = (req: AuthenticatedRequest, action: string) =>
  query('INSERT INTO audit_events(user_id,action) VALUES($1,$2)', [req.user!.id, action]);
const iso = (date: any) => new Date(date).toISOString();
const permissions: Record<string, string[]> = {
  PASSENGER: [],
  DRIVER: ['check-in'],
  MANAGER: ['operations', 'check-in', 'support', 'eligibility', 'reports'],
  ADMIN: [
    'operations',
    'check-in',
    'support',
    'eligibility',
    'reports',
    'promotions',
    'users',
    'audit',
  ],
  FINANCE: ['reports', 'promotions'],
};
const userDto = (u: any) => ({
  id: u.id,
  name: u.full_name ?? u.fullName,
  email: u.email,
  phone: u.phone_number ?? u.phoneNumber ?? '',
  role: u.role,
  active: u.status === 'ACTIVE',
  emailVerified: !!u.email_verified_at,
  permissions: permissions[u.role] ?? [],
});
async function catalog() {
  const [rs, stops, vehicles, trips] = await Promise.all([
    query<any[]>(
      `SELECT r.*,COALESCE((SELECT jsonb_agg(s.stop_id ORDER BY s.stop_order) FROM route_stops s WHERE s.route_id=r.id),'[]') AS stop_ids, COALESCE((SELECT jsonb_agg(s.estimated_time_minutes ORDER BY s.stop_order) FROM route_stops s WHERE s.route_id=r.id),'[]') AS stop_minutes FROM routes r WHERE deleted_at IS NULL`
    ),
    query<any[]>('SELECT * FROM bus_stops WHERE deleted_at IS NULL'),
    query<any[]>('SELECT * FROM buses'),
    query<any[]>(`SELECT t.*,b.total_seats AS capacity,
      GREATEST((SELECT count(*)::int FROM trip_seats s WHERE s.trip_id=t.id AND (s.status IN ('BOOKED','CHECKED_IN') OR (s.status='LOCKED' AND s.lock_expires_at>NOW()))),(SELECT COALESCE(SUM(tk.quantity),0) FROM tickets tk WHERE tk.trip_id=t.id AND tk.status IN ('BOOKED','CHECKED_IN'))) AS occupied
      FROM trips t JOIN buses b ON b.id=t.bus_id WHERE t.status<>'CANCELLED' ORDER BY departure_time`),
  ]);
  return {
    routes: rs.map(r => ({
      id: r.id,
      code: r.code,
      name: r.name,
      price: Number(r.base_price),
      active: r.status === 'ACTIVE',
      stopIds: r.stop_ids,
      stopMinutes: r.stop_minutes,
      origin: stops.find(s => s.id === r.stop_ids[0])?.name ?? '',
      destination: stops.find(s => s.id === r.stop_ids.at(-1))?.name ?? '',
    })),
    stops: stops.map(s => ({
      id: s.id,
      name: s.name,
      address: s.address ?? '',
      lat: Number(s.latitude),
      lng: Number(s.longitude),
    })),
    vehicles: vehicles.map(v => ({
      id: v.id,
      plate: v.plate_number,
      name: v.bus_type,
      capacity: v.total_seats,
      active: v.status === 'READY',
    })),
    trips: trips.map(t => ({
      id: t.id,
      routeId: t.route_id,
      vehicleId: t.bus_id,
      departure: iso(t.departure_time),
      duration: Math.round(
        (new Date(t.arrival_time).getTime() - new Date(t.departure_time).getTime()) / 60000
      ),
      seatMode: true,
      status:
        t.status === 'SCHEDULED'
          ? 'scheduled'
          : t.status === 'IN_TRANSIT'
            ? 'running'
            : 'completed',
      price: Number(t.base_price),
      capacity: t.capacity,
      available: Math.max(0, t.capacity - Number(t.occupied)),
    })),
  };
}
async function getHold(id: string, userId: string, client?: any) {
  const sql = 'SELECT * FROM ui_holds WHERE id=$1 AND user_id=$2';
  const [h] = client
    ? (await client.query(sql, [id, userId])).rows
    : await query<any[]>(sql, [id, userId]);
  if (!h) fail('Không tìm thấy giữ chỗ.', 404);
  return {
    ...h,
    id: h.id,
    tripId: h.trip_id,
    userId: h.user_id,
    seatIds: h.seat_ids,
    quantity: h.quantity,
    price: Number(h.price),
    expiresAt: iso(h.expires_at),
    serverTime: new Date().toISOString(),
    status:
      h.status === 'active' && new Date(h.expires_at).getTime() <= Date.now()
        ? 'expired'
        : h.status,
    boardingStopId: h.boarding_stop_id,
    alightingStopId: h.alighting_stop_id,
  };
}
const bookingSql = `SELECT b.*,h.user_id,h.trip_id,h.seat_ids,h.quantity,h.expires_at,h.status AS hold_status,
 h.boarding_stop_id,h.alighting_stop_id,t.status AS ticket_status,p.status AS payment_status,p.payment_method,p.payment_url,p.amount,e.status AS ticket_email_status
 FROM ui_bookings b JOIN ui_holds h ON h.id=b.hold_id LEFT JOIN tickets t ON t.id=b.ticket_id LEFT JOIN payment_transactions p ON p.ticket_id=t.id LEFT JOIN ticket_email_deliveries e ON e.ticket_id=t.id`;
const bookingDto = (b: any) => ({
  id: b.id,
  holdId: b.hold_id,
  tripId: b.trip_id,
  userId: b.user_id,
  seatIds: b.seat_ids,
  quantity: b.quantity,
  name: b.name,
  phone: b.phone,
  total: Number(b.total),
  discount: Number(b.discount),
  voucher: b.voucher,
  createdAt: iso(b.created_at),
  invoiceRequested: b.invoice_requested,
  ticketEmailStatus: b.ticket_email_status ?? 'pending',
  boardingStopId: b.boarding_stop_id,
  alightingStopId: b.alighting_stop_id,
  status:
    b.ticket_status === 'CANCELLED'
      ? 'canceled'
      : b.payment_status === 'SUCCESS'
        ? 'paid'
        : b.payment_status === 'FAILED'
          ? 'failed'
          : new Date(b.expires_at).getTime() <= Date.now()
            ? 'expired'
            : 'pending',
  refund: b.payment_status === 'REFUNDED' ? 'refunded' : 'none',
});
async function ownBooking(id: string, userId: string) {
  const [b] = await query<any[]>(bookingSql + ' WHERE b.id=$1 AND h.user_id=$2', [id, userId]);
  if (!b) fail('Không tìm thấy đặt vé.', 404);
  return b;
}
const paymentDto = (b: any) =>
  b.ticket_id
    ? {
        id: b.ticket_id,
        bookingId: b.id,
        gateway: b.payment_method === 'MOMO' ? 'MoMo' : 'VNPay',
        amount: Number(b.amount),
        status:
          b.payment_status === 'SUCCESS'
            ? 'paid'
            : b.payment_status === 'PENDING'
              ? 'pending'
              : b.payment_status === 'REFUNDED'
                ? 'canceled'
                : 'failed',
        createdAt: iso(b.created_at),
        redirectUrl: b.payment_url ?? undefined,
      }
    : null;

router.get('/auth/session', authenticateJWT, getMe);
router.post(
  '/auth/forgot-password',
  api(async () => fail('Khôi phục mật khẩu trực tuyến chưa mở. Vui lòng liên hệ nhà xe.', 503))
);
router.use(
  '/auth',
  (req, _res, next) => {
    if (req.path === '/register')
      req.body = {
        ...req.body,
        full_name: req.body.name ?? req.body.full_name,
        phone_number: req.body.phone ?? req.body.phone_number,
      };
    next();
  },
  authRoutes
);
router.get(
  '/catalog',
  api(async () => catalog())
);
router.get(
  '/trips',
  api(async req => {
    const c = await catalog();
    const { from = '', to = '', date = '', time = '' } = req.query;
    if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(time))) fail('Giờ phải có dạng HH:mm.');
    return c.trips.flatMap(t => {
      const r = c.routes.find(r => r.id === t.routeId && r.active);
      if (!r || t.status !== 'scheduled' || Date.parse(t.departure) <= Date.now()) return [];
      const names = r.stopIds.map((id: string) => c.stops.find(s => s.id === id)?.name),
        start = from ? names.indexOf(String(from)) : 0,
        end = to ? names.indexOf(String(to)) : names.length - 1;
      const offset = Number(r.stopMinutes[start] ?? 0);
      const departure = new Date(Date.parse(t.departure) + offset * 60000).toISOString();
      const local = new Date(Date.parse(departure) + 7 * 3600000).toISOString();
      const matches =
        start >= 0 &&
        end > start &&
        Date.parse(departure) > Date.now() &&
        (!date || local.slice(0, 10) === date) &&
        (!time || local.slice(11, 16) >= String(time));
      return matches
        ? [
            {
              ...t,
              departure,
              duration: Math.max(
                1,
                Number(
                  end === r.stopIds.length - 1 ? t.duration : (r.stopMinutes[end] ?? t.duration)
                ) - offset
              ),
            },
          ]
        : [];
    });
  })
);
router.get(
  '/trips/:id',
  api(async req => {
    const t = (await catalog()).trips.find(t => t.id === req.params.id);
    return t ?? fail('Không tìm thấy chuyến.', 404);
  })
);
router.get(
  '/trips/:id/location',
  api(async req => {
    const [l] = await query<any[]>('SELECT * FROM trip_locations WHERE trip_id=$1', [
      req.params.id,
    ]);
    return {
      lat: l ? Number(l.latitude) : 0,
      lng: l ? Number(l.longitude) : 0,
      updatedAt: l ? iso(l.updated_at) : null,
      connected: !!l && Date.now() - new Date(l.updated_at).getTime() < 120000,
      eta: null,
      nextStop: 'Chờ dữ liệu GPS',
    };
  })
);
router.use(authenticateJWT);
router.get(
  '/trips/:id/seats',
  api(async req =>
    transaction(async client => {
      await prepareSeats(client, req.params.id);
      const { rows } = await client.query(
        'SELECT * FROM trip_seats WHERE trip_id=$1 ORDER BY seat_number',
        [req.params.id]
      );
      return rows.map(s => ({
        id: s.seat_number,
        status: ['BOOKED', 'CHECKED_IN'].includes(s.status)
          ? 'booked'
          : s.status === 'LOCKED'
            ? 'held'
            : 'available',
        mine: s.locked_by_user_id === req.user!.id,
      }));
    })
  )
);
router.post(
  '/trips/:id/location',
  api(async req => {
    await updateTripLocation(req.params.id, req.user!.id, req.user!.role, req.body);
    return { success: true };
  })
);
router.put(
  '/auth/profile',
  api(async req => {
    if (
      typeof req.body.name !== 'string' ||
      req.body.name.trim().length < 2 ||
      !/^(0|\+84)\d{9}$/.test(req.body.phone)
    )
      fail('Thông tin hồ sơ không hợp lệ.');
    const [u] = await query<any[]>(
      'UPDATE users SET full_name=$1,phone_number=$2,updated_at=NOW() WHERE id=$3 RETURNING *',
      [req.body.name.trim(), req.body.phone, req.user!.id]
    );
    return userDto(u);
  })
);
router.post(
  '/auth/logout',
  api(async () => true)
);
router.post(
  '/holds',
  api(async req => {
    await assertEmailVerified(req.user!.id);
    const { tripId, seatIds, quantity, from, to } = req.body;
    if (
      !Array.isArray(seatIds) ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 6 ||
      seatIds.length !== quantity ||
      new Set(seatIds).size !== quantity ||
      seatIds.some(s => typeof s !== 'string')
    )
      fail('Chọn từ 1 đến 6 ghế khác nhau.');
    const id = randomUUID();
    await transaction(async client => {
      const t = await prepareSeats(client, tripId);
      if (
        t.status !== 'SCHEDULED' ||
        t.route_status !== 'ACTIVE' ||
        new Date(t.departure_time).getTime() <= Date.now()
      )
        fail('Chuyến đã đóng đặt vé.', 409);
      const { rows: stops } = await client.query(
        'SELECT bs.id,bs.name FROM route_stops rs JOIN bus_stops bs ON bs.id=rs.stop_id WHERE rs.route_id=$1 ORDER BY rs.stop_order',
        [t.route_id]
      );
      const start = from ? stops.findIndex(s => s.name === from) : 0,
        end = to ? stops.findIndex(s => s.name === to) : stops.length - 1;
      if (start < 0 || end <= start) fail('Điểm lên/xuống không đúng chiều tuyến.');
      const { rows: seats } = await client.query(
        'SELECT * FROM trip_seats WHERE trip_id=$1 AND seat_number=ANY($2::text[]) FOR UPDATE',
        [tripId, seatIds]
      );
      if (seats.length !== quantity || seats.some(s => s.status !== 'AVAILABLE'))
        fail('Ghế vừa được giữ hoặc đặt. Vui lòng chọn lại.', 409);
      await client.query(
        `INSERT INTO ui_holds(id,user_id,trip_id,seat_ids,quantity,price,expires_at,boarding_stop_id,alighting_stop_id) VALUES($1,$2,$3,$4,$5,$6,NOW()+INTERVAL '10 minutes',$7,$8)`,
        [
          id,
          req.user!.id,
          tripId,
          JSON.stringify(seatIds),
          quantity,
          t.base_price,
          stops[start].id,
          stops[end].id,
        ]
      );
      await client.query(
        "UPDATE trip_seats SET status='LOCKED',locked_at=NOW(),lock_expires_at=NOW()+INTERVAL '10 minutes',locked_by_user_id=$3 WHERE trip_id=$1 AND seat_number=ANY($2::text[])",
        [tripId, seatIds, req.user!.id]
      );
    });
    await audit(req, 'Giữ chỗ ' + id);
    return getHold(id, req.user!.id);
  })
);
router.get(
  '/holds/:id',
  api(async req => {
    const h = await getHold(req.params.id, req.user!.id);
    const b = await query<any[]>(bookingSql + ' WHERE h.id=$1', [h.id]);
    if (b[0]?.payment_status === 'SUCCESS') h.status = 'converted';
    return h;
  })
);
router.delete(
  '/holds/:id',
  api(async req => {
    const h = await getHold(req.params.id, req.user!.id);
    const [b] = await query<any[]>(bookingSql + ' WHERE h.id=$1', [h.id]);
    if (b?.payment_status === 'PENDING' || b?.payment_status === 'SUCCESS')
      fail('Không giải phóng giữ chỗ đang thanh toán hoặc đã trả tiền.', 409);
    await transaction(async client => {
      await client.query("UPDATE ui_holds SET status='released' WHERE id=$1", [h.id]);
      await client.query(
        "UPDATE trip_seats SET status='AVAILABLE',locked_by_user_id=NULL,lock_expires_at=NULL,locked_at=NULL WHERE trip_id=$1 AND seat_number=ANY($2::text[]) AND locked_by_user_id=$3 AND ticket_id IS NULL",
        [h.tripId, h.seatIds, req.user!.id]
      );
    });
    return true;
  })
);
async function voucherPrice(h: any, code: any) {
  const normalized = String(code ?? '')
    .trim()
    .toUpperCase();
  let percent = 0;
  if (normalized) {
    const [v] = await query<any[]>(
      'SELECT * FROM vouchers WHERE code=$1 AND active AND expires_at>NOW()',
      [normalized]
    );
    if (!v) fail('Voucher không tồn tại hoặc hết hạn.');
    percent = v.percent;
  }
  const subtotal = h.price * h.quantity,
    discount = Math.round((subtotal * percent) / 100);
  return { code: normalized, percent, subtotal, discount, total: subtotal - discount };
}
router.post(
  '/vouchers/preview',
  api(async req => {
    const h = await getHold(req.body.holdId, req.user!.id);
    if (h.status !== 'active') fail('Giữ chỗ hết hạn.', 409);
    return voucherPrice(h, req.body.voucher);
  })
);
router.post(
  '/bookings',
  api(async req => {
    const h = await getHold(req.body.holdId, req.user!.id);
    if (h.status !== 'active') fail('Giữ chỗ hết hạn.', 409);
    if (
      typeof req.body.name !== 'string' ||
      req.body.name.trim().length < 2 ||
      !/^(0|\+84)\d{9}$/.test(req.body.phone)
    )
      fail('Thông tin hành khách không hợp lệ.');
    const price = await voucherPrice(h, req.body.voucher);
    if (price.total <= 0) fail('Voucher không áp dụng cho giao dịch 0 đồng.');
    const [b] = await query<any[]>(
      `INSERT INTO ui_bookings(hold_id,name,phone,total,discount,voucher) VALUES($1,$2,$3,$4,$5,$6)
    ON CONFLICT(hold_id) DO UPDATE SET hold_id=EXCLUDED.hold_id RETURNING id`,
      [h.id, req.body.name.trim(), req.body.phone, price.total, price.discount, price.code || null]
    );
    return bookingDto(await ownBooking(b.id, req.user!.id));
  })
);
router.get(
  '/bookings',
  api(async req =>
    (
      await query<any[]>(bookingSql + ' WHERE h.user_id=$1 ORDER BY b.created_at DESC', [
        req.user!.id,
      ])
    ).map(bookingDto)
  )
);
router.get(
  '/bookings/:id',
  api(async req => {
    const [b] = await query<any[]>(
      bookingSql + ' WHERE (b.id=$1 OR b.ticket_id=$1) AND h.user_id=$2',
      [req.params.id, req.user!.id]
    );
    return b ? bookingDto(b) : fail('Không tìm thấy đặt vé.', 404);
  })
);
router.get(
  '/bookings/:id/payment',
  api(async req => paymentDto(await ownBooking(req.params.id, req.user!.id)))
);
router.post(
  '/payments',
  api(async req => {
    await assertEmailVerified(req.user!.id);
    const method =
      req.body.gateway === 'MoMo'
        ? 'MOMO'
        : ['VNPay', 'Card'].includes(req.body.gateway)
          ? 'VNPAY'
          : fail('Cổng thanh toán chưa được hỗ trợ.');
    const b = await ownBooking(req.body.bookingId, req.user!.id);
    if (bookingDto(b).status === 'paid') return paymentDto(b);
    const ticketId = await transaction(async client => {
      const {
        rows: [locked],
      } = await client.query('SELECT ticket_id FROM ui_bookings WHERE id=$1 FOR UPDATE', [b.id]);
      let existingPayment: any;
      if (locked.ticket_id) {
        const {
          rows: [p],
        } = await client.query(
          `SELECT p.*,t.status AS ticket_status
          FROM payment_transactions p JOIN tickets t ON t.id=p.ticket_id
          WHERE p.ticket_id=$1 FOR UPDATE OF p,t`,
          [locked.ticket_id]
        );
        if (p?.status === 'SUCCESS' && ['BOOKED', 'CHECKED_IN'].includes(p.ticket_status))
          return locked.ticket_id;
        if (p?.status !== 'PENDING' || p.ticket_status !== 'RESERVED')
          fail('Giao dịch đã đóng. Vui lòng đặt lại.', 409);
        existingPayment = p;
      }
      const h = await getHold(b.hold_id, req.user!.id, client);
      if (h.status !== 'active') fail('Giữ chỗ hết hạn.', 409);
      if (locked.ticket_id) {
        if (existingPayment.payment_method === method && existingPayment.payment_url)
          return locked.ticket_id;
        // Keep each gateway order immutable. A late success for the cancelled ticket
        // follows the existing late-payment refund flow instead of issuing a second ticket.
        // Without a saved URL, the provider may have accepted an earlier timed-out request;
        // retry with a new order instead of reusing an ambiguous MoMo order id.
        await client.query("UPDATE payment_transactions SET status='FAILED' WHERE ticket_id=$1", [
          locked.ticket_id,
        ]);
        await client.query(
          "UPDATE tickets SET status='CANCELLED',reservation_expires_at=NULL WHERE id=$1",
          [locked.ticket_id]
        );
        await client.query(
          `UPDATE trip_seats SET ticket_id=NULL
          WHERE ticket_id=$1 AND status='LOCKED' AND locked_by_user_id=$2`,
          [locked.ticket_id, req.user!.id]
        );
      }
      const ticket = await reserveSeatForPayment(
        h.tripId,
        h.seatIds[0],
        req.user!.id,
        method,
        '',
        client
      );
      const { rows: seats } = await client.query(
        'SELECT * FROM trip_seats WHERE trip_id=$1 AND seat_number=ANY($2::text[]) FOR UPDATE',
        [h.tripId, h.seatIds]
      );
      if (
        seats.length !== h.quantity ||
        seats.some(
          s =>
            s.locked_by_user_id !== req.user!.id ||
            s.status !== 'LOCKED' ||
            (s.ticket_id && s.ticket_id !== ticket.id)
        )
      )
        fail('Giữ chỗ đã thay đổi.', 409);
      await client.query(
        'UPDATE tickets SET quantity=$1,fare_amount=$2,reservation_expires_at=$3 WHERE id=$4',
        [h.quantity, b.total, h.expiresAt, ticket.id]
      );
      await client.query('UPDATE payment_transactions SET amount=$1 WHERE ticket_id=$2', [
        b.total,
        ticket.id,
      ]);
      await client.query(
        'UPDATE trip_seats SET ticket_id=$1,lock_expires_at=$2 WHERE trip_id=$3 AND seat_number=ANY($4::text[])',
        [ticket.id, h.expiresAt, h.tripId, h.seatIds]
      );
      await client.query('UPDATE ui_bookings SET ticket_id=$1 WHERE id=$2', [ticket.id, b.id]);
      return ticket.id;
    });
    let updated = await ownBooking(b.id, req.user!.id);
    if (updated.ticket_id !== ticketId)
      fail('Phương thức thanh toán đã thay đổi. Vui lòng thử lại.', 409);
    if (bookingDto(updated).status === 'paid') return paymentDto(updated);
    if (!updated.payment_url) {
      let url: string;
      try {
        url = await gateway.createPaymentUrl(
          method,
          ticketId,
          Number(b.total),
          req.ip?.replace(/^::ffff:/, '') || '127.0.0.1'
        );
      } catch {
        fail('Không khởi tạo được cổng thanh toán. Hãy thử lại hoặc chọn phương thức khác.', 502);
      }
      await query(
        'UPDATE payment_transactions SET payment_url=$1 WHERE ticket_id=$2 AND payment_url IS NULL',
        [url, ticketId]
      );
      updated = await ownBooking(b.id, req.user!.id);
    }
    if (updated.ticket_id !== ticketId)
      fail('Phương thức thanh toán đã thay đổi. Vui lòng thử lại.', 409);
    if (bookingDto(updated).status === 'expired') fail('Giữ chỗ hết hạn.', 409);
    return paymentDto(updated);
  })
);
const ticketsSql = `SELECT t.*,tr.arrival_time,b.id AS booking_id,h.seat_ids,b.name,h.boarding_stop_id,h.alighting_stop_id,q.kind AS request,q.target_trip_id,
  (SELECT min(v.created_at) FROM ticket_validation_logs v WHERE v.ticket_id=t.id AND v.result='VALID') AS checked_in_at
  FROM tickets t JOIN trips tr ON tr.id=t.trip_id JOIN payment_transactions p ON p.ticket_id=t.id
  LEFT JOIN ui_bookings b ON b.ticket_id=t.id LEFT JOIN ui_holds h ON h.id=b.hold_id LEFT JOIN ticket_requests q ON q.ticket_id=t.id WHERE p.status IN ('SUCCESS','REFUNDED')`;
const ticketDto = (t: any) => ({
  id: t.id,
  bookingId: t.booking_id,
  tripId: t.trip_id,
  userId: t.user_id,
  token: JSON.stringify(buildQrPayload(t, { withSecurity: true })),
  expiresAt: iso(new Date(t.arrival_time).getTime() + 90 * 60000),
  status: t.status === 'CHECKED_IN' ? 'used' : t.status === 'CANCELLED' ? 'canceled' : 'valid',
  checkedInAt: t.checked_in_at ? iso(t.checked_in_at) : undefined,
  request: t.request ?? undefined,
  exchangeTripId: t.target_trip_id ?? undefined,
});
router.get(
  '/tickets',
  api(async req =>
    (
      await query<any[]>(ticketsSql + ' AND t.user_id=$1 ORDER BY t.created_at DESC', [
        req.user!.id,
      ])
    ).map(ticketDto)
  )
);
router.get(
  '/tickets/:id',
  api(async req => {
    const [t] = await query<any[]>(ticketsSql + ' AND t.id=$1 AND t.user_id=$2', [
      req.params.id,
      req.user!.id,
    ]);
    return t ? ticketDto(t) : fail('Không tìm thấy vé.', 404);
  })
);
router.post(
  '/tickets/:id/requests',
  api(async req => {
    const { kind, exchangeTripId } = req.body;
    if (!['cancel', 'exchange'].includes(kind)) fail('Loại yêu cầu không hợp lệ.');
    await transaction(async client => {
      const {
        rows: [ticket],
      } = await client.query(
        `SELECT t.*,tr.departure_time,tr.route_id,tr.base_price FROM tickets t JOIN trips tr ON tr.id=t.trip_id JOIN payment_transactions p ON p.ticket_id=t.id WHERE t.id=$1 AND t.user_id=$2 AND p.status='SUCCESS' FOR UPDATE OF t`,
        [req.params.id, req.user!.id]
      );
      if (!ticket) fail('Không tìm thấy vé.', 404);
      if (ticket.status !== 'BOOKED' || Date.parse(ticket.departure_time) <= Date.now() + 1800000)
        fail('Vé không còn đủ điều kiện hủy/đổi.', 409);
      if (kind === 'exchange') {
        const {
          rows: [target],
        } = await client.query(
          `SELECT * FROM trips WHERE id=$1 AND status='SCHEDULED' AND departure_time>NOW()`,
          [exchangeTripId]
        );
        if (
          !target ||
          target.id === ticket.trip_id ||
          target.route_id !== ticket.route_id ||
          Number(target.base_price) !== Number(ticket.base_price)
        )
          fail('Chọn chuyến khác cùng tuyến và cùng giá vé.');
      }
      await client.query(
        'INSERT INTO ticket_requests(ticket_id,kind,target_trip_id) VALUES($1,$2,$3)',
        [ticket.id, kind, kind === 'exchange' ? exchangeTripId : null]
      );
    });
    const [t] = await query<any[]>(ticketsSql + ' AND t.id=$1', [req.params.id]);
    return ticketDto(t);
  })
);
router.get(
  '/ticket-requests',
  api(async req => {
    roles(req);
    return (
      await query<any[]>(ticketsSql + ' AND q.ticket_id IS NOT NULL ORDER BY q.created_at')
    ).map(ticketDto);
  })
);
router.put(
  '/ticket-requests/:id',
  api(async req => {
    roles(req);
    const id = req.params.id;
    if (typeof req.body.approve !== 'boolean') fail('Cần chọn chấp nhận hoặc từ chối.');
    const [pending] = await query<any[]>('SELECT * FROM ticket_requests WHERE ticket_id=$1', [id]);
    if (!pending) fail('Không tìm thấy yêu cầu.', 404);
    if (req.body.approve && pending.kind === 'cancel')
      await cancelTicket(id, req.user!.id, req.user!.role, true);
    if (req.body.approve && pending.kind === 'exchange')
      await transaction(async client => {
        const {
          rows: [t],
        } = await client.query(
          `SELECT t.*,tr.departure_time,tr.route_id,tr.base_price FROM tickets t JOIN trips tr ON tr.id=t.trip_id WHERE t.id=$1 FOR UPDATE OF t`,
          [id]
        );
        if (!t || t.status !== 'BOOKED' || Date.parse(t.departure_time) <= Date.now() + 1800000)
          fail('Vé không còn đủ điều kiện đổi.', 409);
        const {
          rows: [current],
        } = await client.query('SELECT * FROM ticket_requests WHERE ticket_id=$1 FOR UPDATE', [id]);
        if (current?.kind !== 'exchange' || current.target_trip_id !== pending.target_trip_id)
          fail('Yêu cầu đã thay đổi hoặc đã xử lý.', 409);
        const target = await prepareSeats(client, pending.target_trip_id);
        if (
          target.status !== 'SCHEDULED' ||
          target.route_status !== 'ACTIVE' ||
          Date.parse(target.departure_time) <= Date.now() ||
          target.route_id !== t.route_id ||
          Number(target.base_price) !== Number(t.base_price)
        )
          fail('Chuyến đổi không còn phù hợp.', 409);
        const { rows: seats } = await client.query(
          `SELECT * FROM trip_seats WHERE trip_id=$1 AND status='AVAILABLE' ORDER BY seat_number LIMIT $2 FOR UPDATE`,
          [target.id, t.quantity]
        );
        if (seats.length !== t.quantity) fail('Chuyến đổi không đủ ghế.', 409);
        await client.query(
          `UPDATE trip_seats SET status='AVAILABLE',ticket_id=NULL WHERE ticket_id=$1`,
          [id]
        );
        await client.query(
          `UPDATE trip_seats SET status='BOOKED',ticket_id=$1 WHERE id=ANY($2::text[])`,
          [id, seats.map((s: any) => s.id)]
        );
        await client.query('UPDATE tickets SET trip_id=$1,seat_number=$2 WHERE id=$3', [
          target.id,
          seats[0].seat_number,
          id,
        ]);
        await client.query(
          `UPDATE ui_holds h SET trip_id=$1,seat_ids=$2::jsonb FROM ui_bookings b WHERE b.hold_id=h.id AND b.ticket_id=$3`,
          [target.id, JSON.stringify(seats.map((s: any) => s.seat_number)), id]
        );
        await client.query(
          'UPDATE trips SET booked_seats=GREATEST(0,booked_seats-$1) WHERE id=$2',
          [t.quantity, t.trip_id]
        );
        await client.query('UPDATE trips SET booked_seats=booked_seats+$1 WHERE id=$2', [
          t.quantity,
          target.id,
        ]);
        await client.query('DELETE FROM ticket_requests WHERE ticket_id=$1', [id]);
      });
    if (!req.body.approve)
      await transaction(async client => {
        await client.query('SELECT id FROM tickets WHERE id=$1 FOR UPDATE', [id]);
        const { rows } = await client.query(
          'DELETE FROM ticket_requests WHERE ticket_id=$1 RETURNING ticket_id',
          [id]
        );
        if (!rows.length) fail('Yêu cầu đã được xử lý.', 409);
      });
    await audit(req, 'Xử lý yêu cầu vé ' + id);
    const [t] = await query<any[]>(ticketsSql + ' AND t.id=$1', [id]);
    await createNotification(t.user_id, {
      type: 'SYSTEM',
      title: 'Yêu cầu vé đã xử lý',
      body: req.body.approve ? 'Yêu cầu đã được chấp nhận.' : 'Yêu cầu đã bị từ chối.',
    });
    return ticketDto(t);
  })
);
router.post(
  '/ticket-validations',
  api(async req => {
    const result = await validateTicketQr({
      code: req.body.token,
      tripId: req.body.tripId,
      validatedBy: req.user!.id,
      validatedRole: req.user!.role,
    });
    const [t] = await query<any[]>(ticketsSql + ' AND t.id=$1', [result.ticket.id]);
    return {
      valid: !result.isAlreadyCheckedIn,
      message: result.isAlreadyCheckedIn ? 'Vé đã được sử dụng.' : 'Vé hợp lệ · đã ghi nhận lên xe',
      ticketId: t.id,
      ticketCode: t.ticket_code,
      passengerName: t.name ?? result.ticket.user.fullName,
      seatNumbers: t.seat_ids ?? [t.seat_number],
      quantity: t.quantity,
      checkedInAt: t.checked_in_at ? iso(t.checked_in_at) : undefined,
    };
  })
);
router.get(
  '/ticket-validations/checked-in',
  api(async req => {
    const id = String(req.query.tripId ?? '');
    await assertTripAccess(id, req.user!.id, req.user!.role);
    return (
      await query<any[]>(
        ticketsSql + " AND t.trip_id=$1 AND t.status='CHECKED_IN' ORDER BY checked_in_at DESC",
        [id]
      )
    ).map(t => ({
      ticketId: t.id,
      ticketCode: t.ticket_code,
      passengerName: t.name ?? 'Hành khách',
      seatNumbers: t.seat_ids ?? [t.seat_number],
      quantity: t.quantity,
      checkedInAt: iso(t.checked_in_at),
    }));
  })
);
router.get(
  '/staff/trips',
  api(async req => {
    roles(req, ['ADMIN', 'MANAGER', 'DRIVER']);
    const c = await catalog();
    if (req.user!.role !== 'DRIVER') return c.trips;
    const assigned = await query<any[]>('SELECT id FROM trips WHERE driver_id=$1', [req.user!.id]);
    return c.trips.filter(t => assigned.some(a => a.id === t.id));
  })
);
router.get(
  '/reports',
  api(async req => {
    roles(req, ['ADMIN', 'MANAGER', 'FINANCE']);
    const { from, to, routeId = '', vehicleId = '' } = req.query;
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(String(from)) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(String(to)) ||
      String(from) > String(to)
    )
      fail('Khoảng ngày không hợp lệ.');
    const rows = await query<any[]>(
      `SELECT r.id AS "routeId",r.code||' · '||r.name AS route,
    (tr.departure_time AT TIME ZONE 'Asia/Ho_Chi_Minh')::date::text AS date,
    COALESCE(SUM(p.net),0)::numeric AS revenue,COALESCE(SUM(p.tickets),0)::int AS tickets,SUM(b.total_seats)::int AS capacity
    FROM trips tr JOIN routes r ON r.id=tr.route_id JOIN buses b ON b.id=tr.bus_id
    LEFT JOIN LATERAL (SELECT SUM(CASE WHEN pt.status='SUCCESS' THEN pt.amount ELSE 0 END) AS net,
      SUM(CASE WHEN pt.status='SUCCESS' AND t.status IN ('BOOKED','CHECKED_IN') THEN t.quantity ELSE 0 END) AS tickets
      FROM tickets t JOIN payment_transactions pt ON pt.ticket_id=t.id WHERE t.trip_id=tr.id) p ON true
    WHERE (tr.departure_time AT TIME ZONE 'Asia/Ho_Chi_Minh')::date BETWEEN $1::date AND $2::date
      AND ($3='' OR tr.route_id=$3) AND ($4='' OR tr.bus_id=$4) AND tr.status<>'CANCELLED'
    GROUP BY r.id,r.code,r.name,date ORDER BY date,r.code`,
      [from, to, routeId, vehicleId]
    );
    rows.forEach(r => {
      r.revenue = Number(r.revenue);
      r.occupancy = r.capacity ? Math.round((r.tickets / r.capacity) * 100) : 0;
    });
    const tickets = rows.reduce((n, r) => n + r.tickets, 0),
      capacity = rows.reduce((n, r) => n + r.capacity, 0);
    return {
      rows,
      revenue: rows.reduce((n, r) => n + r.revenue, 0),
      tickets,
      occupancy: capacity ? Math.round((tickets / capacity) * 100) : 0,
      refunds: (
        await query<any[]>(
          `SELECT COALESCE(b.id,t.id) AS id,p.amount AS total,'refunded' AS refund FROM payment_transactions p JOIN tickets t ON t.id=p.ticket_id JOIN trips tr ON tr.id=t.trip_id LEFT JOIN ui_bookings b ON b.ticket_id=t.id WHERE p.status='REFUNDED' AND (tr.departure_time AT TIME ZONE 'Asia/Ho_Chi_Minh')::date BETWEEN $1::date AND $2::date AND ($3='' OR tr.route_id=$3) AND ($4='' OR tr.bus_id=$4)`,
          [from, to, routeId, vehicleId]
        )
      ).map(r => ({ ...r, total: Number(r.total) })),
    };
  })
);
router.get(
  ['/audit', '/audit-logs'],
  api(async req => {
    roles(req, ['ADMIN']);
    return (
      await query<any[]>(
        'SELECT a.*,u.full_name FROM audit_events a LEFT JOIN users u ON u.id=a.user_id ORDER BY a.created_at DESC LIMIT 500'
      )
    ).map(a => ({
      id: a.id,
      actor: a.full_name ?? a.user_id,
      action: a.action,
      createdAt: iso(a.created_at),
    }));
  })
);
router.get(
  '/vouchers',
  api(async req => {
    roles(req, ['ADMIN', 'FINANCE']);
    return (await query<any[]>('SELECT * FROM vouchers ORDER BY code')).map(v => ({
      ...v,
      expiresAt: iso(v.expires_at),
    }));
  })
);
router.post(
  '/vouchers',
  api(async req => {
    roles(req, ['ADMIN', 'FINANCE']);
    const v = req.body;
    if (
      !/^[A-Z0-9_-]{3,30}$/.test(v.code) ||
      !Number.isInteger(v.percent) ||
      v.percent < 1 ||
      v.percent >= 100 ||
      !Number.isFinite(Date.parse(v.expiresAt)) ||
      Date.parse(v.expiresAt) <= Date.now()
    )
      fail('Voucher không hợp lệ.');
    const [row] = await query<any[]>(
      'INSERT INTO vouchers(code,percent,expires_at,active) VALUES($1,$2,$3,$4) RETURNING *',
      [v.code, v.percent, v.expiresAt, v.active === true]
    );
    await audit(req, 'Tạo voucher ' + v.code);
    return { ...row, expiresAt: iso(row.expires_at) };
  })
);
router.get(
  '/notifications',
  api(async req =>
    (await listNotifications(req.user!.id, { limit: 100 })).items.map(n => ({
      id: n.id,
      userId: n.user_id,
      title: n.title,
      body: n.body ?? '',
      read: n.is_read,
      createdAt: iso(n.created_at),
      href: n.data?.tripId ? '/tracking/' + n.data.tripId : '/account/tickets',
    }))
  )
);
router.post(
  '/notifications/read',
  api(async req => {
    if (req.body.id) {
      if (!(await markNotificationRead(req.user!.id, req.body.id)))
        fail('Không tìm thấy thông báo.', 404);
    } else await markAllNotificationsRead(req.user!.id);
    return true;
  })
);
router.post(
  '/notifications/subscriptions',
  api(async req => {
    await query(
      'INSERT INTO trip_subscriptions(user_id,trip_id) VALUES($1,$2) ON CONFLICT DO NOTHING',
      [req.user!.id, req.body.tripId]
    );
    return true;
  })
);
router.get(
  '/users',
  api(async req => {
    roles(req, ['ADMIN']);
    return (
      await query<any[]>(
        'SELECT id,full_name,email,phone_number,role,status FROM users ORDER BY full_name'
      )
    ).map(userDto);
  })
);
router.get(
  '/operations/driver-accounts',
  api(async req => {
    roles(req);
    return (
      await query<any[]>(
        "SELECT id,full_name,email,phone_number,role,status FROM users WHERE role='DRIVER' AND status='ACTIVE'"
      )
    ).map(userDto);
  })
);
router.put(
  '/users/:id',
  api(async req => {
    roles(req, ['ADMIN']);
    if (req.params.id === req.user!.id) fail('Không đổi quyền tài khoản đang đăng nhập.');
    const { role, active } = req.body;
    if (!permissions[role] || typeof active !== 'boolean')
      fail('Vai trò hoặc trạng thái không hợp lệ.');
    if (
      req.body.permissions &&
      JSON.stringify([...req.body.permissions].sort()) !==
        JSON.stringify([...permissions[role]].sort())
    )
      fail('API hiện dùng bộ quyền chuẩn theo vai trò.');
    const [u] = await query<any[]>(
      `UPDATE users SET role=$1,role_id=(SELECT id FROM roles WHERE name=$1),status=$2,updated_at=NOW() WHERE id=$3 RETURNING *`,
      [role, active ? 'ACTIVE' : 'INACTIVE', req.params.id]
    );
    if (!u) fail('Không tìm thấy tài khoản.', 404);
    await audit(req, 'Cập nhật quyền ' + u.id);
    return userDto(u);
  })
);
router.post(
  '/users',
  api(async req => {
    roles(req, ['ADMIN']);
    const { name, email, password, role, phone = '' } = req.body;
    if (
      typeof name !== 'string' ||
      name.trim().length < 2 ||
      typeof email !== 'string' ||
      !/^\S+@\S+\.\S+$/.test(email) ||
      typeof password !== 'string' ||
      password.length < 10 ||
      !permissions[role]
    )
      fail('Thông tin tài khoản không hợp lệ.');
    const [u] = await query<any[]>(
      `INSERT INTO users(full_name,email,password_hash,phone_number,role,role_id) VALUES($1,$2,$3,$4,$5,(SELECT id FROM roles WHERE name=$5)) RETURNING *`,
      [
        name.trim(),
        email.trim().toLowerCase(),
        await bcrypt.hash(password, 12),
        phone || null,
        role,
      ]
    );
    await audit(req, 'Tạo tài khoản ' + u.id);
    return userDto(u);
  })
);
const supportDto = (s: any) => ({
  id: s.id,
  userId: s.user_id,
  subject: s.subject,
  message: s.message,
  rating: s.rating,
  reply: s.reply,
  status: s.reply ? 'resolved' : 'open',
  createdAt: iso(s.created_at),
});
router.get(
  ['/support', '/support/all'],
  api(async req => {
    if (req.path.endsWith('/all')) roles(req);
    return (
      await query<any[]>(
        'SELECT * FROM support_requests' +
          (req.path.endsWith('/all') ? '' : ' WHERE user_id=$1') +
          ' ORDER BY created_at DESC',
        req.path.endsWith('/all') ? [] : [req.user!.id]
      )
    ).map(supportDto);
  })
);
router.post(
  '/support',
  api(async req => {
    const { subject, message, rating } = req.body;
    if (
      typeof subject !== 'string' ||
      subject.trim().length < 3 ||
      typeof message !== 'string' ||
      message.trim().length < 10 ||
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5
    )
      fail('Nội dung phản ánh không hợp lệ.');
    const [s] = await query<any[]>(
      'INSERT INTO support_requests(user_id,subject,message,rating) VALUES($1,$2,$3,$4) RETURNING *',
      [req.user!.id, subject.trim(), message.trim(), rating]
    );
    await audit(req, 'Gửi phản ánh ' + s.id);
    return supportDto(s);
  })
);
router.put(
  '/support/:id',
  api(async req => {
    roles(req);
    if (typeof req.body.reply !== 'string' || req.body.reply.trim().length < 5)
      fail('Phản hồi ít nhất 5 ký tự.');
    const [s] = await query<any[]>('UPDATE support_requests SET reply=$1 WHERE id=$2 RETURNING *', [
      req.body.reply.trim(),
      req.params.id,
    ]);
    if (!s) fail('Không tìm thấy phản ánh.', 404);
    await createNotification(s.user_id, {
      type: 'SUPPORT_REPLY',
      title: 'Phản ánh đã được trả lời',
      body: s.reply,
    });
    await audit(req, 'Trả lời phản ánh ' + s.id);
    return supportDto(s);
  })
);
const eligibilityDto = (e: any) => ({
  id: e.id,
  userId: e.user_id,
  category: e.category,
  document: e.document,
  status: e.status,
});
router.get(
  '/passes',
  api(async req => ({
    passes: [],
    eligibility: (
      await query<any[]>('SELECT * FROM eligibility_applications WHERE user_id=$1', [req.user!.id])
    ).map(eligibilityDto),
  }))
);
router.post(
  '/passes',
  api(async () => fail('Vé tháng chưa mở bán qua cổng thanh toán. Vui lòng liên hệ nhà xe.', 503))
);
router.post(
  '/eligibility',
  api(async req => {
    const { category, document } = req.body;
    if (
      !['student', 'elderly', 'STUDENT', 'ELDERLY', 'Sinh viên', 'Người cao tuổi'].includes(
        category
      ) ||
      typeof document !== 'string' ||
      document.trim().length < 5
    )
      fail('Hồ sơ không hợp lệ.');
    const [e] = await query<any[]>(
      'INSERT INTO eligibility_applications(user_id,category,document) VALUES($1,$2,$3) RETURNING *',
      [req.user!.id, category, document.trim()]
    );
    return eligibilityDto(e);
  })
);
router.get(
  '/eligibility/pending',
  api(async req => {
    roles(req);
    return (
      await query<any[]>("SELECT * FROM eligibility_applications WHERE status='pending'")
    ).map(eligibilityDto);
  })
);
router.put(
  '/eligibility/:id',
  api(async req => {
    roles(req);
    if (typeof req.body.approve !== 'boolean') fail('Quyết định không hợp lệ.');
    const [e] = await query<any[]>(
      "UPDATE eligibility_applications SET status=$1 WHERE id=$2 AND status='pending' RETURNING *",
      [req.body.approve ? 'approved' : 'rejected', req.params.id]
    );
    if (!e) fail('Hồ sơ đã xử lý hoặc không tồn tại.', 409);
    await query('UPDATE users SET discount_status=$1,discount_type=$2 WHERE id=$3', [
      req.body.approve ? 'APPROVED' : 'REJECTED',
      ['elderly', 'người cao tuổi'].includes(e.category.toLowerCase()) ? 'ELDERLY' : 'STUDENT',
      e.user_id,
    ]);
    await audit(req, 'Duyệt hồ sơ ' + e.id);
    return eligibilityDto(e);
  })
);
router.get(
  '/incidents',
  api(async req => {
    const rows = await query<any[]>(
      "SELECT * FROM incidents WHERE ($1='' OR trip_id=$1) ORDER BY created_at DESC",
      [String(req.query.tripId ?? '')]
    );
    return rows.map(i => ({
      id: i.id,
      tripId: i.trip_id,
      message: i.description,
      createdAt: iso(i.created_at),
      resolved: i.action_taken === 'RESOLVED',
    }));
  })
);
router.post(
  '/incidents',
  api(async req => {
    await assertTripAccess(req.body.tripId, req.user!.id, req.user!.role);
    if (typeof req.body.message !== 'string' || req.body.message.trim().length < 10)
      fail('Mô tả ít nhất 10 ký tự.');
    const [i] = await query<any[]>(
      "INSERT INTO incidents(trip_id,driver_id,incident_type,description) VALUES($1,$2,'OTHER',$3) RETURNING *",
      [req.body.tripId, req.user!.id, req.body.message.trim()]
    );
    const recipients = await query<any[]>(
      "SELECT user_id FROM tickets WHERE trip_id=$1 AND status IN ('BOOKED','CHECKED_IN') UNION SELECT user_id FROM trip_subscriptions WHERE trip_id=$1",
      [i.trip_id]
    );
    for (const p of recipients)
      if (p.user_id)
        await createNotification(p.user_id, {
          type: 'INCIDENT',
          title: 'Cập nhật sự cố chuyến xe',
          body: i.description,
          data: { tripId: i.trip_id },
        });
    await audit(req, 'Báo sự cố ' + i.id);
    return {
      id: i.id,
      tripId: i.trip_id,
      message: i.description,
      createdAt: iso(i.created_at),
      resolved: false,
    };
  })
);
router.put(
  '/incidents/:id',
  api(async req => {
    roles(req);
    const [i] = await query<any[]>(
      "UPDATE incidents SET action_taken='RESOLVED' WHERE id=$1 RETURNING *",
      [req.params.id]
    );
    if (!i) fail('Không tìm thấy sự cố.', 404);
    return {
      id: i.id,
      tripId: i.trip_id,
      message: i.description,
      createdAt: iso(i.created_at),
      resolved: true,
    };
  })
);
router.get(
  '/payments/:id/booking',
  api(async req => {
    const [b] = await query<any[]>(bookingSql + ' WHERE b.ticket_id=$1 AND h.user_id=$2', [
      req.params.id,
      req.user!.id,
    ]);
    return b ? { id: b.id } : fail('Không tìm thấy giao dịch.', 404);
  })
);
router.post(
  '/bookings/:id/invoice',
  api(async req => {
    const b = await ownBooking(req.params.id, req.user!.id);
    if (bookingDto(b).status !== 'paid') fail('Chỉ gửi chứng từ cho giao dịch đã thanh toán.', 409);
    const [u] = await query<any[]>('SELECT email FROM users WHERE id=$1', [req.user!.id]);
    const delivered = await sendEmail(
      u.email,
      'SmartBus · Biên nhận thanh toán ' + b.id,
      `Mã đặt vé: ${b.id}\nKhách hàng: ${b.name}\nSố vé: ${b.quantity}\nSố tiền đã thu: ${b.total} VND\nMã giao dịch: ${b.ticket_id}\nĐây là biên nhận thanh toán; hóa đơn thuế được cấp theo quy trình của nhà xe.`
    );
    if (!delivered) fail('Chưa gửi được email. Nhà xe cần cấu hình SMTP hoặc thử lại.', 503);
    await query('UPDATE ui_bookings SET invoice_requested=true WHERE id=$1', [b.id]);
    return { message: 'Đã gửi biên nhận thanh toán qua email.' };
  })
);
router.put(
  '/vouchers/:id',
  api(async req => {
    roles(req, ['ADMIN', 'FINANCE']);
    const v = req.body;
    if (
      typeof v.active !== 'boolean' ||
      !Number.isInteger(v.percent) ||
      v.percent < 1 ||
      v.percent >= 100 ||
      !Number.isFinite(Date.parse(v.expiresAt))
    )
      fail('Voucher không hợp lệ.');
    const [r] = await query<any[]>(
      'UPDATE vouchers SET code=$1,percent=$2,expires_at=$3,active=$4 WHERE id=$5 RETURNING *',
      [v.code, v.percent, v.expiresAt, v.active, req.params.id]
    );
    if (!r) fail('Không tìm thấy voucher.', 404);
    return { ...r, expiresAt: iso(r.expires_at) };
  })
);
router.delete(
  '/vouchers/:id',
  api(async req => {
    roles(req, ['ADMIN', 'FINANCE']);
    await query('DELETE FROM vouchers WHERE id=$1', [req.params.id]);
    return true;
  })
);
const staffDto = (s: any) => ({ id: s.id, userId: s.user_id, name: s.name, phone: s.phone });
async function resources(key: string) {
  const c = await catalog();
  if (['routes', 'stops', 'vehicles', 'trips'].includes(key)) return (c as any)[key];
  if (key === 'staff') return (await query<any[]>('SELECT * FROM staff_profiles')).map(staffDto);
  if (key === 'assignments')
    return (
      await query<any[]>(
        'SELECT t.id,t.id AS "tripId",t.bus_id AS "vehicleId",s.id AS "staffId" FROM trips t JOIN staff_profiles s ON s.user_id=t.driver_id'
      )
    ).map(a => a);
  return fail('Danh mục không tồn tại.', 404);
}
router.get(
  '/operations/:key',
  api(async req => {
    roles(req);
    return resources(req.params.key);
  })
);
router.all(
  ['/operations/:key', '/operations/:key/:id'],
  api(async req => {
    roles(req);
    const key = req.params.key,
      id = req.params.id || randomUUID(),
      d = req.body;
    if (!['POST', 'PUT', 'DELETE'].includes(req.method)) fail('Phương thức không hỗ trợ.', 405);
    if (req.method === 'DELETE') {
      const tables: Record<string, string> = {
        routes: 'routes',
        stops: 'bus_stops',
        vehicles: 'buses',
        staff: 'staff_profiles',
        trips: 'trips',
      };
      if (key === 'assignments') {
        const rows = await query<any[]>(
          "UPDATE trips SET driver_id=NULL WHERE id=$1 AND status='SCHEDULED' AND departure_time>NOW() RETURNING id",
          [id]
        );
        if (!rows.length) fail('Chỉ bỏ phân công chuyến chưa chạy.', 409);
        return true;
      }
      if (!tables[key]) fail('Danh mục không tồn tại.', 404);
      const checks: Record<string, string> = {
        routes: 'SELECT id FROM trips WHERE route_id=$1',
        stops: 'SELECT id FROM route_stops WHERE stop_id=$1',
        vehicles: 'SELECT id FROM trips WHERE bus_id=$1',
        staff:
          'SELECT t.id FROM trips t JOIN staff_profiles s ON s.user_id=t.driver_id WHERE s.id=$1',
        trips: 'SELECT id FROM tickets WHERE trip_id=$1',
      };
      if ((await query<any[]>(checks[key], [id])).length)
        fail('Bản ghi đang được sử dụng. Hãy ngừng hoạt động.', 409);
      await query('DELETE FROM ' + tables[key] + ' WHERE id=$1', [id]);
      await audit(req, 'Xóa ' + key + ' ' + id);
      return true;
    }
    if (req.method === 'PUT' && !(await resources(key)).some((row: any) => row.id === id))
      fail('Bản ghi không tồn tại.', 404);
    await transaction(async client => {
      if (key === 'routes') {
        if (
          typeof d.name !== 'string' ||
          d.name.trim().length < 3 ||
          typeof d.code !== 'string' ||
          !d.code.trim() ||
          !Number.isFinite(d.price) ||
          d.price <= 0 ||
          typeof d.active !== 'boolean' ||
          !Array.isArray(d.stopIds) ||
          d.stopIds.length < 2 ||
          new Set(d.stopIds).size !== d.stopIds.length
        )
          fail('Tuyến không hợp lệ.');
        const { rows: stops } = await client.query(
          'SELECT id,name FROM bus_stops WHERE id=ANY($1::text[])',
          [d.stopIds]
        );
        if (
          stops.length !== d.stopIds.length ||
          stops.find(s => s.id === d.stopIds[0])?.name !== d.origin ||
          stops.find(s => s.id === d.stopIds.at(-1))?.name !== d.destination
        )
          fail('Thứ tự điểm đầu/cuối không hợp lệ.');
        await client.query('SELECT id FROM routes WHERE id=$1 FOR UPDATE', [id]);
        const { rows: oldStops } = await client.query(
          'SELECT stop_id FROM route_stops WHERE route_id=$1 ORDER BY stop_order',
          [id]
        );
        const stopsChanged =
          JSON.stringify(oldStops.map(s => s.stop_id)) !== JSON.stringify(d.stopIds);
        if (stopsChanged && oldStops.length) {
          const { rows: trips } = await client.query(
            'SELECT id FROM trips WHERE route_id=$1 LIMIT 1',
            [id]
          );
          if (trips.length) fail('Tuyến đã có chuyến. Hãy tạo tuyến mới khi thay đổi trạm.', 409);
        }
        await client.query(
          `INSERT INTO routes(id,code,name,base_price,status) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO UPDATE SET code=$2,name=$3,base_price=$4,status=$5,updated_at=NOW()`,
          [id, d.code.trim(), d.name.trim(), d.price, d.active ? 'ACTIVE' : 'INACTIVE']
        );
        if (stopsChanged) {
          await client.query('DELETE FROM route_stops WHERE route_id=$1', [id]);
          for (let index = 0; index < d.stopIds.length; index++)
            await client.query(
              'INSERT INTO route_stops(route_id,stop_id,stop_order,estimated_time_minutes) VALUES($1,$2,$3,$4)',
              [id, d.stopIds[index], index + 1, index * 15]
            );
        }
      } else if (key === 'stops') {
        if (
          typeof d.name !== 'string' ||
          d.name.trim().length < 2 ||
          !Number.isFinite(d.lat) ||
          Math.abs(d.lat) > 90 ||
          !Number.isFinite(d.lng) ||
          Math.abs(d.lng) > 180
        )
          fail('Trạm không hợp lệ.');
        await client.query(
          `INSERT INTO bus_stops(id,code,name,address,latitude,longitude) VALUES($1,$6,$2,$3,$4,$5) ON CONFLICT(id) DO UPDATE SET name=$2,address=$3,latitude=$4,longitude=$5`,
          [id, d.name.trim(), String(d.address ?? ''), d.lat, d.lng, 'STOP-' + id.slice(0, 8)]
        );
      } else if (key === 'vehicles') {
        if (
          typeof d.plate !== 'string' ||
          d.plate.trim().length < 5 ||
          !Number.isInteger(d.capacity) ||
          d.capacity < 1 ||
          d.capacity > 100 ||
          typeof d.active !== 'boolean'
        )
          fail('Xe không hợp lệ.');
        await client.query('SELECT id FROM buses WHERE id=$1 FOR UPDATE', [id]);
        const { rows: busy } = await client.query(
          'SELECT t.id FROM trips t JOIN buses b ON b.id=t.bus_id WHERE b.id=$1 AND b.total_seats<>$2 LIMIT 1',
          [id, d.capacity]
        );
        if (busy.length) fail('Xe đã có chuyến. Hãy dùng xe mới khi thay đổi sức chứa.', 409);
        await client.query(
          `INSERT INTO buses(id,plate_number,bus_type,total_seats,status) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO UPDATE SET plate_number=$2,bus_type=$3,total_seats=$4,status=$5`,
          [id, d.plate.trim(), d.name || 'STANDARD', d.capacity, d.active ? 'READY' : 'MAINTENANCE']
        );
      } else if (key === 'staff') {
        const {
          rows: [user],
        } = await client.query(
          "SELECT id FROM users WHERE id=$1 AND role='DRIVER' AND status='ACTIVE'",
          [d.userId]
        );
        if (
          !user ||
          typeof d.name !== 'string' ||
          d.name.trim().length < 2 ||
          typeof d.phone !== 'string'
        )
          fail('Nhân sự phải là tài xế đang hoạt động.');
        await client.query(
          'INSERT INTO staff_profiles(id,user_id,name,phone) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO UPDATE SET user_id=$2,name=$3,phone=$4',
          [id, d.userId, d.name.trim(), d.phone]
        );
      } else if (key === 'trips' || key === 'assignments') {
        const tripId = key === 'trips' ? id : d.tripId;
        const {
          rows: [previous],
        } = await client.query('SELECT * FROM trips WHERE id=$1 FOR UPDATE', [tripId]);
        if (
          previous &&
          (previous.status !== 'SCHEDULED' || Date.parse(previous.departure_time) <= Date.now())
        )
          fail('Chỉ chỉnh sửa chuyến chưa chạy.', 409);
        const {
          rows: [vehicle],
        } = await client.query("SELECT * FROM buses WHERE id=$1 AND status='READY' FOR UPDATE", [
          d.vehicleId,
        ]);
        if (!vehicle) fail('Xe không hoạt động.');
        const { rows: busy } = await client.query(
          "SELECT id FROM trip_seats WHERE trip_id=$1 AND (status IN ('BOOKED','CHECKED_IN') OR (status='LOCKED' AND lock_expires_at>NOW()))",
          [tripId]
        );
        if (busy.length && (key === 'trips' || previous?.bus_id !== d.vehicleId))
          fail('Chuyến đang có vé hoặc giữ chỗ.', 409);
        if (key === 'trips') {
          if (
            !Number.isFinite(Date.parse(d.departure)) ||
            Date.parse(d.departure) <= Date.now() ||
            !Number.isInteger(d.duration) ||
            d.duration < 1 ||
            d.duration > 1440
          )
            fail('Giờ chạy hoặc thời lượng không hợp lệ.');
          const {
            rows: [route],
          } = await client.query(
            "SELECT * FROM routes WHERE id=$1 AND status='ACTIVE' FOR UPDATE",
            [d.routeId]
          );
          if (!route) fail('Tuyến không hoạt động.');
          const arrival = new Date(Date.parse(d.departure) + d.duration * 60000).toISOString();
          const { rows: overlap } = await client.query(
            "SELECT id FROM trips WHERE id<>$1 AND bus_id=$2 AND status<>'CANCELLED' AND departure_time<$4::timestamptz AND arrival_time>$3::timestamptz",
            [tripId, d.vehicleId, d.departure, arrival]
          );
          if (overlap.length) fail('Xe trùng lịch chạy.', 409);
          if (previous?.driver_id) {
            await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [previous.driver_id]);
            const { rows: driverOverlap } = await client.query(
              "SELECT id FROM trips WHERE id<>$1 AND driver_id=$2 AND status<>'CANCELLED' AND departure_time<$4::timestamptz AND arrival_time>$3::timestamptz",
              [tripId, previous.driver_id, d.departure, arrival]
            );
            if (driverOverlap.length) fail('Tài xế trùng lịch chạy.', 409);
          }
          await client.query(
            `INSERT INTO trips(id,route_id,bus_id,departure_time,arrival_time,base_price,total_seats) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(id) DO UPDATE SET route_id=$2,bus_id=$3,departure_time=$4,arrival_time=$5,base_price=$6,total_seats=$7`,
            [
              tripId,
              d.routeId,
              d.vehicleId,
              d.departure,
              arrival,
              route.base_price,
              vehicle.total_seats,
            ]
          );
          if (previous) await client.query('DELETE FROM trip_seats WHERE trip_id=$1', [tripId]);
        } else {
          if (!previous) fail('Không tìm thấy chuyến.', 404);
          const {
            rows: [staff],
          } = await client.query(
            "SELECT s.user_id FROM staff_profiles s JOIN users u ON u.id=s.user_id WHERE s.id=$1 AND u.status='ACTIVE' AND u.role='DRIVER' FOR UPDATE OF u",
            [d.staffId]
          );
          if (!staff) fail('Tài xế không hoạt động.');
          const { rows: overlap } = await client.query(
            "SELECT id FROM trips WHERE id<>$1 AND (bus_id=$2 OR driver_id=$3) AND status<>'CANCELLED' AND departure_time<$5::timestamptz AND arrival_time>$4::timestamptz",
            [tripId, d.vehicleId, staff.user_id, previous.departure_time, previous.arrival_time]
          );
          if (overlap.length) fail('Xe hoặc tài xế trùng lịch.', 409);
          await client.query('UPDATE trips SET bus_id=$1,driver_id=$2,total_seats=$3 WHERE id=$4', [
            d.vehicleId,
            staff.user_id,
            vehicle.total_seats,
            tripId,
          ]);
          if (previous.bus_id !== d.vehicleId)
            await client.query('DELETE FROM trip_seats WHERE trip_id=$1', [tripId]);
        }
      } else fail('Danh mục không tồn tại.', 404);
    });
    await audit(req, 'Lưu ' + key + ' ' + id);
    return (await resources(key)).find(
      (row: any) => row.id === (key === 'assignments' ? d.tripId : id)
    );
  })
);
export default router;

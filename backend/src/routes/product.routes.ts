import { Router, RequestHandler, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import { query, transaction } from '../config/database';
import { createSchedule } from '../services/schedule.service';
import { transportAnalytics } from '../services/transport-analytics.service';
import { assertTripAccess } from '../services/trip-access.service';
import { notifyTripChange } from '../services/trip-notification.service';
import { assignCrew, listCrew } from '../services/crew-assignment.service';
import { invoiceHtml } from '../services/invoice.service';
import { appLogger } from '../config/logger';
import { rescheduleTrip } from '../services/reschedule.service';
const router = Router();
const api =
  (
    roles: string[],
    fn: (req: AuthenticatedRequest, res: Response) => Promise<any>
  ): RequestHandler =>
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!roles.includes(req.user?.role || ''))
        throw Object.assign(new Error('Không có quyền.'), { status: 403 });
      const data = await fn(req, res);
      if (!res.headersSent) res.json(data);
    } catch (error: any) {
      appLogger.error('product_request_failed', { path: req.path, error });
      if (!res.headersSent)
        res.status(error.status || (error.code === '23505' ? 409 : 500)).json({
          success: false,
          message: error.status ? error.message : 'Không thể xử lý yêu cầu.',
        });
    }
  };
const managers = ['ADMIN', 'MANAGER'],
  reports = ['ADMIN', 'MANAGER', 'FINANCE'];
router.post(
  '/trips/:id/reschedule',
  api(managers, async req => rescheduleTrip(req.params.id, req.body.departure, req.body.arrival))
);
router.get(
  '/fare-policies',
  api(managers, async () => query('SELECT * FROM fare_policies ORDER BY category'))
);
router.put(
  '/fare-policies/:category',
  api(managers, async req => {
    const { ticketDiscount, monthlyPrice } = req.body;
    if (
      !Number.isInteger(ticketDiscount) ||
      ticketDiscount < 0 ||
      ticketDiscount > 80 ||
      !Number.isSafeInteger(monthlyPrice) ||
      monthlyPrice < 1000 ||
      monthlyPrice > 10000000
    )
      throw Object.assign(new Error('Chính sách giá không hợp lệ.'), { status: 400 });
    const [row] = await query<any[]>(
      'UPDATE fare_policies SET ticket_discount_percent=$2,monthly_price=$3,updated_at=NOW() WHERE category=$1 RETURNING *',
      [req.params.category, ticketDiscount, monthlyPrice]
    );
    if (!row) throw Object.assign(new Error('Không tìm thấy nhóm chính sách.'), { status: 404 });
    return row;
  })
);
const dates = (req: AuthenticatedRequest) => {
  const { from, to, routeId = '', vehicleId = '' } = req.query;
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(String(from)) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(String(to)) ||
    String(from) > String(to) ||
    !Number.isFinite(Date.parse(String(from))) ||
    !Number.isFinite(Date.parse(String(to))) ||
    Date.parse(String(to)) - Date.parse(String(from)) > 366 * 86400000
  )
    throw Object.assign(new Error('Khoảng ngày không hợp lệ; tối đa 366 ngày.'), { status: 400 });
  return [from, to, routeId, vehicleId];
};
router.get(
  '/schedules',
  api(managers, async () =>
    query(
      'SELECT id,name,route_id AS "routeId",config,created_at AS "createdAt" FROM schedule_templates ORDER BY created_at DESC'
    )
  )
);
router.post(
  '/schedules',
  api(managers, async req => createSchedule(req.user!.id, req.body))
);
router.delete(
  '/schedules/:id',
  api(managers, async req =>
    transaction(async client => {
      const { rows: trips } = await client.query(
        'SELECT * FROM trips WHERE schedule_id=$1 ORDER BY id FOR UPDATE',
        [req.params.id]
      );
      if (!trips.length) throw Object.assign(new Error('Không tìm thấy lịch.'), { status: 404 });
      const { rows: busy } = await client.query(
        `SELECT id FROM tickets WHERE trip_id=ANY($1::text[]) AND status<>'CANCELLED' UNION SELECT id FROM ui_holds WHERE trip_id=ANY($1::text[]) AND status='active' AND expires_at>NOW() UNION SELECT pass_id FROM pass_checkins WHERE trip_id=ANY($1::text[])`,
        [trips.map(t => t.id)]
      );
      if (
        busy.length ||
        trips.some(t => t.status !== 'SCHEDULED' || Date.parse(t.departure_time) <= Date.now())
      )
        throw Object.assign(
          new Error('Lịch đã có vé/giữ chỗ hoặc chuyến đã chạy, không thể hủy hàng loạt.'),
          { status: 409 }
        );
      await client.query("UPDATE trips SET status='CANCELLED' WHERE schedule_id=$1", [
        req.params.id,
      ]);
      return true;
    })
  )
);
router.get(
  '/operations/assignments',
  api(managers, async req => listCrew(req.query.archived === 'true'))
);
router.post(
  '/operations/assignments',
  api(managers, async req => assignCrew(req.body))
);
router.put(
  '/operations/assignments/:id',
  api(managers, async req => assignCrew({ ...req.body, tripId: req.params.id }))
);
router.post(
  '/trips/:id/delay',
  api(['ADMIN', 'MANAGER', 'DRIVER'], async req => {
    await assertTripAccess(req.params.id, req.user!.id, req.user!.role);
    const minutes = req.body.minutes;
    if (!Number.isInteger(minutes) || minutes < 0 || minutes > 1440)
      throw Object.assign(new Error('Số phút trễ không hợp lệ.'), { status: 400 });
    const [trip] = await query<any[]>(
      'UPDATE trips SET delay_minutes=$2 WHERE id=$1 RETURNING id',
      [req.params.id, minutes]
    );
    await notifyTripChange(
      trip.id,
      'Cập nhật trễ chuyến',
      minutes ? 'Chuyến xe dự kiến trễ ' + minutes + ' phút.' : 'Chuyến xe đã trở lại lịch dự kiến.'
    );
    return { minutes };
  })
);
router.get(
  '/reports/per-trip',
  api(reports, async req =>
    query(
      `SELECT tr.id AS "tripId",r.name AS route,b.plate_number AS vehicle,tr.departure_time AS departure,b.total_seats AS capacity,
  ((SELECT COALESCE(SUM(quantity),0) FROM tickets WHERE trip_id=tr.id AND status IN ('BOOKED','CHECKED_IN'))+(SELECT count(*) FROM pass_checkins WHERE trip_id=tr.id))::int AS passengers,
  ROUND(100.0*((SELECT COALESCE(SUM(quantity),0) FROM tickets WHERE trip_id=tr.id AND status IN ('BOOKED','CHECKED_IN'))+(SELECT count(*) FROM pass_checkins WHERE trip_id=tr.id))/GREATEST(1,b.total_seats))::int AS occupancy
  FROM trips tr JOIN routes r ON r.id=tr.route_id JOIN buses b ON b.id=tr.bus_id
  WHERE tr.status<>'CANCELLED' AND (tr.departure_time AT TIME ZONE 'Asia/Ho_Chi_Minh')::date BETWEEN $1::date AND $2::date AND ($3='' OR r.id=$3) AND ($4='' OR b.id=$4)
  ORDER BY tr.departure_time`,
      dates(req)
    )
  )
);
router.get(
  '/reports/strategy',
  api(reports, async req => {
    const [from, to, routeId] = dates(req),
      forecastDate = String(req.query.forecastDate || new Date().toISOString().slice(0, 10)),
      peakFactor = Number(req.query.peakFactor ?? 1);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(forecastDate) ||
      !Number.isFinite(Date.parse(forecastDate)) ||
      !Number.isFinite(peakFactor) ||
      peakFactor < 1 ||
      peakFactor > 3
    )
      throw Object.assign(new Error('Ngày dự báo hoặc hệ số cao điểm không hợp lệ.'), {
        status: 400,
      });
    return transportAnalytics(String(from), String(to), String(routeId), forecastDate, peakFactor);
  })
);
router.get(
  '/bookings/:id/invoice',
  api(['PASSENGER', 'ADMIN', 'MANAGER', 'FINANCE'], async (req, res) => {
    const [row] = await query<any[]>(
      `SELECT i.* FROM electronic_invoices i JOIN ui_bookings b ON b.id=i.booking_id JOIN ui_holds h ON h.id=b.hold_id WHERE b.id=$1 AND h.user_id=$2 AND i.status='issued'`,
      [req.params.id, req.user!.id]
    );
    if (!row) throw Object.assign(new Error('Chưa có hóa đơn.'), { status: 404 });
    res.type('html').send(invoiceHtml(row));
  })
);
router.get(
  '/refund-jobs',
  api(reports, async () =>
    query(
      'SELECT ticket_id AS "ticketId",status,attempts,next_attempt_at AS "nextAttemptAt",last_error AS "lastError" FROM refund_jobs ORDER BY created_at DESC LIMIT 100'
    )
  )
);
export default router;

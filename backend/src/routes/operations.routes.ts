import { authenticateJWT, AuthenticatedRequest } from '../middlewares/auth';
import { authorizeRoles } from '../middlewares/rbac';
import { Router, Request, Response } from 'express';
import { query } from '../config/database';
import { appLogger } from '../config/logger';

const logger = appLogger.child('operations');
const router = Router();

// 1. Dashboard summary kết nối trực tiếp PostgreSQL (US 19, 20)
router.get(
  '/dashboard/summary',
  authenticateJWT,
  authorizeRoles('ADMIN', 'MANAGER'),
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const trips = await query<any[]>(
        `SELECT t.id, b.plate_number AS "busPlate", t.departure_time AS "departureTime", t.arrival_time AS "arrivalTime",
              b.total_seats AS "totalSeats", (SELECT COUNT(*) FROM tickets tk WHERE tk.trip_id=t.id AND tk.status IN ('BOOKED','CHECKED_IN')) AS "bookedSeats", t.status,
              r.code AS "routeCode", r.name AS "routeName", t.base_price AS "basePrice"
       FROM trips t
       JOIN routes r ON t.route_id = r.id
       LEFT JOIN buses b ON t.bus_id = b.id
       ORDER BY t.departure_time ASC`
      );

      const [{ totalRoutes }] = await query<any[]>(
        'SELECT COUNT(*) AS "totalRoutes" FROM routes WHERE status = \'ACTIVE\''
      );
      const [{ totalIncidents }] = await query<any[]>(
        'SELECT COUNT(*) AS "totalIncidents" FROM incidents'
      );

      let totalSeats = 0;
      let totalBooked = 0;
      trips.forEach(t => {
        totalSeats += t.totalSeats || 40;
        totalBooked += Number(t.bookedSeats) || 0;
      });

      const averageOccupancy = totalSeats > 0 ? Math.round((totalBooked / totalSeats) * 100) : 0;

      res.status(200).json({
        success: true,
        tripOccupancy: trips,
        summary: {
          totalTrips: trips.length,
          totalRoutes,
          totalIncidents,
          averageOccupancy,
          totalBooked,
        },
      });
    } catch (err: any) {
      logger.error('dashboard_summary_failed', {
        table: 'routes/trips/tickets/incidents/feedbacks',
        operation: 'select',
        error: err,
      });
      res.status(500).json({
        success: false,
        message: `Lỗi CSDL PostgreSQL: ${err.message}`,
      });
    }
  }
);

// 2. Danh sách sự cố (US 11)
router.get(
  '/incidents',
  authenticateJWT,
  authorizeRoles('ADMIN', 'MANAGER', 'DRIVER'),
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const incidents = await query<any[]>(
        `SELECT i.id, i.trip_id AS "tripId", i.driver_id AS "driverId", i.incident_type AS "incidentType",
              i.severity, i.description, i.delay_minutes AS "delayMinutes", i.action_taken AS "actionTaken",
              i.created_at AS "createdAt",
              b.plate_number AS "busPlate", r.code AS "routeCode"
       FROM incidents i
       LEFT JOIN trips t ON i.trip_id = t.id
       LEFT JOIN routes r ON t.route_id = r.id
       LEFT JOIN buses b ON b.id=t.bus_id
       ORDER BY i.created_at DESC`
      );

      res.status(200).json({
        success: true,
        data: incidents,
      });
    } catch (err: any) {
      logger.error('incidents_list_failed', {
        table: 'incidents',
        operation: 'select',
        error: err,
      });
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// 3. Báo cáo sự cố từ tài xế (US 11)
router.post(
  '/incidents',
  authenticateJWT,
  authorizeRoles('ADMIN', 'MANAGER', 'DRIVER'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { tripId, incidentType, description, delayMinutes = 0, severity = 'MEDIUM' } = req.body;
      const driverId = (req as AuthenticatedRequest).user!.id;

      if (!tripId || !description) {
        res.status(400).json({ success: false, message: 'Thiếu thông tin sự cố!' });
        return;
      }

      const result: any = await query(
        `INSERT INTO incidents (trip_id, driver_id, incident_type, severity, description, delay_minutes, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING id`,
        [tripId, driverId, incidentType || 'TRAFFIC_JAM', severity, description, delayMinutes]
      );

      res.status(201).json({
        success: true,
        message: 'Báo cáo sự cố thành công vào PostgreSQL!',
        data: {
          id: result[0].id,
          tripId,
          incidentType,
          description,
          delayMinutes,
        },
      });
    } catch (err: any) {
      logger.error('incident_create_failed', {
        table: 'incidents',
        operation: 'insert',
        trip_id: String(req.body?.tripId ?? ''),
        error: err,
      });
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// 4. Danh sách đánh giá & phản hồi (US 24)
router.get(
  '/feedbacks',
  authenticateJWT,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const feedbacks = await query<any[]>(
        `SELECT f.id, f.trip_id AS "tripId", f.user_id AS "userId", f.rating_stars AS "ratingStars",
              f.criteria, f.content, f.created_at AS "createdAt",
              u.full_name AS "passengerName"
       FROM feedbacks f
       LEFT JOIN users u ON f.user_id = u.id
       WHERE ($1::boolean OR f.user_id = $2)
       ORDER BY f.created_at DESC`,
        [['ADMIN', 'MANAGER'].includes(req.user!.role), req.user!.id]
      );

      res.status(200).json({
        success: true,
        data: feedbacks,
      });
    } catch (err: any) {
      logger.error('feedbacks_list_failed', {
        table: 'feedbacks',
        operation: 'select',
        error: err,
      });
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// 5. Gửi đánh giá phản hồi (US 24)
router.post('/feedbacks', authenticateJWT, async (req: Request, res: Response): Promise<void> => {
  try {
    const { tripId, ratingStars = 5, criteria = 'General', content } = req.body;
    const userId = (req as AuthenticatedRequest).user!.id;

    if (
      !tripId ||
      !content ||
      !Number.isInteger(Number(ratingStars)) ||
      Number(ratingStars) < 1 ||
      Number(ratingStars) > 5
    ) {
      res.status(400).json({
        success: false,
        message: 'Vui lòng chọn chuyến, số sao từ 1 đến 5 và nhập nội dung đánh giá!',
      });
      return;
    }

    const eligibleTickets = await query<any[]>(
      `SELECT t.id
     FROM tickets t
     JOIN trips tr ON tr.id=t.trip_id
     LEFT JOIN payment_transactions p ON p.ticket_id=t.id
     WHERE t.trip_id=$1 AND t.user_id=$2
       AND t.status IN ('BOOKED','CHECKED_IN')
       AND (tr.status='COMPLETED' OR tr.arrival_time <= NOW())
       AND (p.ticket_id IS NULL OR p.status='SUCCESS')
     LIMIT 1`,
      [tripId, userId]
    );
    if (eligibleTickets.length === 0) {
      res.status(403).json({
        success: false,
        message: 'Chỉ hành khách có vé hợp lệ mới được đánh giá sau khi chuyến đã hoàn thành.',
      });
      return;
    }

    const result: any = await query(
      `INSERT INTO feedbacks (trip_id, user_id, rating_stars, criteria, content, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id`,
      [tripId, userId, ratingStars, criteria, content]
    );

    res.status(201).json({
      success: true,
      message: 'Lưu đánh giá thành công vào PostgreSQL!',
      data: { id: result[0].id, ratingStars, content },
    });
  } catch (err: any) {
    logger.error('feedback_create_failed', {
      table: 'feedbacks',
      operation: 'insert',
      trip_id: String(req.body?.tripId ?? ''),
      error: err,
    });
    res.status(500).json({ success: false, message: err.message });
  }
});

// 6. Danh sách Voucher (US 18)
router.get('/vouchers', async (_req: Request, res: Response): Promise<void> => {
  res.status(200).json({
    success: true,
    data: [
      { code: 'ICTU50', discountPercent: 50, description: 'Giảm 50% cho sinh viên ICTU' },
      { code: 'SMARTBUS10', discountPercent: 10, description: 'Giảm 10% vé lượt toàn hệ thống' },
    ],
  });
});

export default router;

import { Router, Request, Response } from 'express';
import { query } from '../config/database';

const router = Router();

// 1. Dashboard summary kết nối trực tiếp MySQL (US 19, 20)
router.get('/dashboard/summary', async (_req: Request, res: Response): Promise<void> => {
  try {
    const trips = await query<any[]>(
      `SELECT t.id, t.bus_plate AS busPlate, t.departure_time AS departureTime, t.arrival_time AS arrivalTime,
              t.total_seats AS totalSeats, t.booked_seats AS bookedSeats, t.status,
              r.code AS routeCode, r.name AS routeName, r.base_price AS basePrice
       FROM trips t
       JOIN routes r ON t.route_id = r.id
       ORDER BY t.departure_time ASC`
    );

    const [{ totalRoutes }] = await query<any[]>('SELECT COUNT(*) AS totalRoutes FROM routes WHERE status = "ACTIVE"');
    const [{ totalIncidents }] = await query<any[]>('SELECT COUNT(*) AS totalIncidents FROM incidents');

    let totalSeats = 0;
    let totalBooked = 0;
    trips.forEach((t) => {
      totalSeats += t.totalSeats || 40;
      totalBooked += t.bookedSeats || 0;
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
    console.error('Lỗi dashboard summary:', err);
    res.status(500).json({
      success: false,
      message: `Lỗi CSDL MySQL: ${err.message}`,
    });
  }
});

// 2. Danh sách sự cố (US 11)
router.get('/incidents', async (_req: Request, res: Response): Promise<void> => {
  try {
    const incidents = await query<any[]>(
      `SELECT i.id, i.trip_id AS tripId, i.driver_id AS driverId, i.incident_type AS incidentType,
              i.severity, i.description, i.delay_minutes AS delayMinutes, i.action_taken AS actionTaken,
              i.created_at AS createdAt,
              t.bus_plate AS busPlate, r.code AS routeCode
       FROM incidents i
       LEFT JOIN trips t ON i.trip_id = t.id
       LEFT JOIN routes r ON t.route_id = r.id
       ORDER BY i.created_at DESC`
    );

    res.status(200).json({
      success: true,
      data: incidents,
    });
  } catch (err: any) {
    console.error('Lỗi lấy danh sách sự cố:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. Báo cáo sự cố từ tài xế (US 11)
router.post('/incidents', async (req: Request, res: Response): Promise<void> => {
  try {
    const { tripId, incidentType, description, delayMinutes = 0, severity = 'MEDIUM' } = req.body;
    const driverId = (req as any).user?.id || 3;

    if (!tripId || !description) {
      res.status(400).json({ success: false, message: 'Thiếu thông tin sự cố!' });
      return;
    }

    const result: any = await query(
      `INSERT INTO incidents (trip_id, driver_id, incident_type, severity, description, delay_minutes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [tripId, driverId, incidentType || 'TRAFFIC_JAM', severity, description, delayMinutes]
    );

    res.status(201).json({
      success: true,
      message: 'Báo cáo sự cố thành công vào MySQL!',
      data: {
        id: result.insertId,
        tripId,
        incidentType,
        description,
        delayMinutes,
      },
    });
  } catch (err: any) {
    console.error('Lỗi báo cáo sự cố:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. Danh sách đánh giá & phản hồi (US 24)
router.get('/feedbacks', async (_req: Request, res: Response): Promise<void> => {
  try {
    const feedbacks = await query<any[]>(
      `SELECT f.id, f.trip_id AS tripId, f.user_id AS userId, f.rating_stars AS ratingStars,
              f.criteria, f.content, f.created_at AS createdAt,
              u.full_name AS passengerName
       FROM feedbacks f
       LEFT JOIN users u ON f.user_id = u.id
       ORDER BY f.created_at DESC`
    );

    res.status(200).json({
      success: true,
      data: feedbacks,
    });
  } catch (err: any) {
    console.error('Lỗi lấy feedbacks:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 5. Gửi đánh giá phản hồi (US 24)
router.post('/feedbacks', async (req: Request, res: Response): Promise<void> => {
  try {
    const { tripId, userId, ratingStars = 5, criteria = 'General', content } = req.body;

    if (!content) {
      res.status(400).json({ success: false, message: 'Vui lòng nhập nội dung đánh giá!' });
      return;
    }

    const result: any = await query(
      `INSERT INTO feedbacks (trip_id, user_id, rating_stars, criteria, content, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [tripId || 1, userId || null, ratingStars, criteria, content]
    );

    res.status(201).json({
      success: true,
      message: 'Lưu đánh giá thành công vào MySQL!',
      data: { id: result.insertId, ratingStars, content },
    });
  } catch (err: any) {
    console.error('Lỗi gửi feedback:', err);
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

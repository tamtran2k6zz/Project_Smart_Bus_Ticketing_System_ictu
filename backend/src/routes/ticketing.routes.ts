import { Router, Request, Response } from 'express';
import { query } from '../config/database';
import { getSeatsByTrip } from '../controllers/seats.controller';

const router = Router();

// 1. Lấy sơ đồ ghế chuyến xe (US 02) từ bảng trip_seats
router.get('/trips/:tripId/seats', getSeatsByTrip);

// 2. Đặt vé và sinh mã QR trong MySQL (US 02, 03, 04, 06)
router.post('/bookings', async (req: Request, res: Response): Promise<void> => {
  try {
    const { tripId, userId, seatNumber, customerEmail } = req.body;

    if (!tripId || !seatNumber) {
      res.status(400).json({ success: false, message: 'Vui lòng chọn chuyến xe và vị trí ghế!' });
      return;
    }

    // Kiểm tra ghế đã đặt chưa
    const existing = await query<any[]>(
      'SELECT id FROM tickets WHERE trip_id = ? AND seat_number = ? AND status IN ("BOOKED", "CHECKED_IN") LIMIT 1',
      [tripId, seatNumber]
    );

    if (existing.length > 0) {
      res.status(409).json({ success: false, message: `Ghế ${seatNumber} đã có người đặt trước!` });
      return;
    }

    const ticketId = `tkt-${Date.now()}`;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const ticketCode = `TKT-${seatNumber}-${randomSuffix}`;
    const qrCode = `SMARTBUS-QR-${ticketCode}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrCode)}`;
    const reservationExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const fareAmount = 10000;

    // Lưu vé vào CSDL MySQL
    await query(
      `INSERT INTO tickets (id, ticket_code, trip_id, status, seat_number, user_id, fare_amount, created_at)
       VALUES (?, ?, ?, 'BOOKED', ?, ?, ?, NOW())`,
      [ticketId, ticketCode, tripId, seatNumber, userId || 4, fareAmount]
    );

    // Cập nhật số ghế đã đặt trên chuyến
    await query('UPDATE trips SET booked_seats = booked_seats + 1 WHERE id = ?', [tripId]);

    // Đồng bộ trạng thái ghế trong bảng trip_seats
    await query(
      `UPDATE trip_seats
       SET status = 'BOOKED', ticket_id = ?, locked_at = NULL, lock_expires_at = NULL
       WHERE trip_id = ? AND seat_number = ?`,
      [ticketId, tripId, seatNumber]
    );

    const bookingPayload = {
      booking: {
        id: `bk-${Date.now()}`,
        tripId,
        bookingCode: `BK-${Date.now().toString().slice(-6)}`,
        status: 'CONFIRMED',
        totalAmount: fareAmount,
      },
      ticket: {
        id: ticketId,
        ticketCode,
        seatNumber,
        fareAmount,
        price: fareAmount,
        status: 'BOOKED',
        reservationExpiresAt,
      },
      payment: {
        amount: fareAmount,
        status: 'SUCCESS',
        paidAt: new Date().toISOString(),
      },
      qrCode,
      qrCodeUrl,
      // Flat properties fallback
      ticketId,
      ticketCode,
      seatNumber,
      fareAmount,
      status: 'BOOKED',
      expiresAt: reservationExpiresAt,
    };

    res.status(201).json({
      success: true,
      message: 'Đặt vé thành công!',
      data: bookingPayload,
      ...bookingPayload,
    });
  } catch (err: any) {
    console.error('Lỗi đặt vé:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. Soát vé QR (US 15 - Tài xế / Phụ xe)
router.post('/verify', async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.body;

    if (!code || !code.trim()) {
      res.status(400).json({ success: false, message: 'Vui lòng cung cấp mã vé hoặc chuỗi quét QR!' });
      return;
    }

    const cleanCode = code.trim();
    const rows = await query<any[]>(
      `SELECT t.id, t.ticket_code, t.trip_id, t.status, t.seat_number, t.fare_amount, t.created_at,
              u.full_name AS userName, u.email AS userEmail,
              r.name AS routeName, r.code AS routeCode
       FROM tickets t
       LEFT JOIN users u ON t.user_id = u.id
       LEFT JOIN trips tr ON t.trip_id = tr.id
       LEFT JOIN routes r ON tr.route_id = r.id
       WHERE t.ticket_code = ? OR t.id = ? OR ? LIKE CONCAT('%', t.ticket_code, '%')
       LIMIT 1`,
      [cleanCode, cleanCode, cleanCode]
    );

    if (rows.length === 0) {
      res.status(404).json({
        success: false,
        message: `Mã vé hoặc chuỗi QR "${cleanCode}" không tìm thấy trong CSDL MySQL!`,
      });
      return;
    }

    const ticket = rows[0];
    const isAlreadyCheckedIn = ticket.status === 'CHECKED_IN';

    // Cập nhật trạng thái đã soát vé
    if (!isAlreadyCheckedIn) {
      await query('UPDATE tickets SET status = "CHECKED_IN" WHERE id = ?', [ticket.id]);
      await query(
        'UPDATE trip_seats SET status = "CHECKED_IN" WHERE trip_id = ? AND seat_number = ?',
        [ticket.trip_id, ticket.seat_number]
      );
    }

    res.status(200).json({
      success: true,
      isAlreadyCheckedIn,
      message: isAlreadyCheckedIn ? 'Vé này đã được quét trước đó!' : 'Soát vé thành công!',
      ticket: {
        id: ticket.id,
        ticketCode: ticket.ticket_code,
        seatNumber: ticket.seat_number || 'A01',
        fareAmount: ticket.fare_amount,
        status: 'CHECKED_IN',
        user: {
          fullName: ticket.userName || 'Lê Thị Hành Khách',
          email: ticket.userEmail || 'khachhang@gmail.com',
        },
        trip: {
          route: {
            name: ticket.routeName || 'Bến xe Mỹ Đình - Bến xe Long Biên',
            code: ticket.routeCode || 'R01',
          },
        },
      },
    });
  } catch (err: any) {
    console.error('Lỗi soát vé:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

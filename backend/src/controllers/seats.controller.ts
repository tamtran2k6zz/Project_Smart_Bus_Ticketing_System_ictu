import { Request, Response } from 'express';
import { query } from '../config/database';

/**
 * Controller Quản Lý Sơ Đồ Ghế & Trạng Thái Ghế Theo Chuyến Xe (US 02, US 03)
 * Tác giả: La Công Tuấn
 */

// 1. Lấy danh sách sơ đồ ghế và trạng thái thực tế theo chuyến xe
export const getSeatsByTrip = async (req: Request, res: Response): Promise<void> => {
  try {
    const tripId = req.params.tripId || req.query.tripId;

    if (!tripId) {
      res.status(400).json({
        statusCode: 400,
        success: false,
        message: 'Vui lòng cung cấp mã chuyến xe (tripId)!',
      });
      return;
    }

    // 1. Kiểm tra chuyến xe có tồn tại trong CSDL không
    const tripRows = await query<any[]>(
      `SELECT t.id, t.bus_id, t.bus_plate, COALESCE(b.total_seats, t.total_seats, 40) AS total_seats,
              b.bus_type
       FROM trips t
       LEFT JOIN buses b ON t.bus_id = b.id
       WHERE t.id = ?
       LIMIT 1`,
      [tripId]
    );

    if (tripRows.length === 0) {
      res.status(404).json({
        statusCode: 404,
        success: false,
        message: `Không tìm thấy chuyến xe có mã: ${tripId}`,
      });
      return;
    }

    const trip = tripRows[0];
    const busId = trip.bus_id || 'bus-01';

    // 2. Tự động giải phóng các ghế giữ chỗ đã hết hạn khóa (Timeout > 10 phút)
    await query(
      `UPDATE trip_seats
       SET status = 'AVAILABLE', locked_at = NULL, locked_by_user_id = NULL, lock_expires_at = NULL
       WHERE trip_id = ? AND status = 'LOCKED' AND lock_expires_at IS NOT NULL AND lock_expires_at < NOW()`,
      [tripId]
    );

    // 3. Kiểm tra xem chuyến xe đã có dữ liệu trong bảng trip_seats chưa
    let seatRows = await query<any[]>(
      `SELECT 
         ts.id AS trip_seat_id,
         ts.seat_number,
         ts.status,
         ts.locked_at,
         ts.lock_expires_at,
         ts.ticket_id,
         COALESCE(s.id, CONCAT('seat-', ts.seat_number)) AS seat_id,
         COALESCE(s.seat_type, 'STANDARD') AS seat_type,
         COALESCE(s.row_position, 'WINDOW') AS row_position,
         COALESCE(s.deck, 'DECK_1') AS deck,
         COALESCE(s.is_priority, 0) AS is_priority
       FROM trip_seats ts
       LEFT JOIN seats s ON ts.seat_id = s.id
       WHERE ts.trip_id = ?
       ORDER BY ts.seat_number ASC`,
      [tripId]
    );

    // 4. Cơ chế Lazy-Initialization: Tự động khởi tạo trip_seats nếu chuyến xe mới chưa có ghế
    if (seatRows.length === 0) {
      console.log(`[Auto-Init] Khởi tạo sơ đồ ghế tự động cho chuyến xe ID ${tripId}...`);

      // Lấy danh mục ghế cố định từ bảng seats
      let busSeats = await query<any[]>(
        'SELECT id, seat_number, seat_type, row_position, deck, is_priority FROM seats WHERE bus_id = ?',
        [busId]
      );

      // Nếu xe chưa có trong bảng seats, sinh 40 ghế mặc định vào bảng seats
      if (busSeats.length === 0) {
        const total = trip.total_seats || 40;
        const half = Math.ceil(total / 2);
        const remaining = total - half;

        for (let i = 1; i <= half; i++) {
          const numStr = i < 10 ? `0${i}` : `${i}`;
          const seatNum = `A${numStr}`;
          const isPri = i <= 2 ? 1 : 0;
          await query(
            `INSERT IGNORE INTO seats (id, bus_id, seat_number, seat_type, row_position, deck, is_priority, status)
             VALUES (?, ?, ?, ?, ?, 'DECK_1', ?, 'ACTIVE')`,
            [`seat-${busId}-${seatNum}`, busId, seatNum, isPri ? 'PRIORITY' : 'STANDARD', isPri ? 'FRONT' : (i % 2 === 1 ? 'WINDOW' : 'AISLE'), isPri]
          );
        }

        for (let i = 1; i <= remaining; i++) {
          const numStr = i < 10 ? `0${i}` : `${i}`;
          const seatNum = `B${numStr}`;
          const isPri = i <= 2 ? 1 : 0;
          await query(
            `INSERT IGNORE INTO seats (id, bus_id, seat_number, seat_type, row_position, deck, is_priority, status)
             VALUES (?, ?, ?, ?, ?, 'DECK_1', ?, 'ACTIVE')`,
            [`seat-${busId}-${seatNum}`, busId, seatNum, isPri ? 'PRIORITY' : 'STANDARD', isPri ? 'FRONT' : (i % 2 === 0 ? 'WINDOW' : 'AISLE'), isPri]
          );
        }

        busSeats = await query<any[]>(
          'SELECT id, seat_number, seat_type, row_position, deck, is_priority FROM seats WHERE bus_id = ?',
          [busId]
        );
      }

      // Lấy các vé đã mua trước đó (nếu có)
      const existingTickets = await query<any[]>(
        'SELECT id, seat_number, status FROM tickets WHERE trip_id = ? AND status IN ("BOOKED", "CHECKED_IN")',
        [tripId]
      );
      const ticketMap = new Map<string, any>();
      for (const t of existingTickets) {
        if (t.seat_number) ticketMap.set(t.seat_number, t);
      }

      // Nạp vào trip_seats
      for (const s of busSeats) {
        const ticket = ticketMap.get(s.seat_number);
        const status = ticket ? ticket.status : 'AVAILABLE';
        const ticketId = ticket ? ticket.id : null;

        await query(
          `INSERT INTO trip_seats (trip_id, seat_id, seat_number, status, ticket_id)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE status = VALUES(status), ticket_id = VALUES(ticket_id)`,
          [tripId, s.id, s.seat_number, status, ticketId]
        );
      }

      // Truy vấn lại sau khi khởi tạo
      seatRows = await query<any[]>(
        `SELECT 
           ts.id AS trip_seat_id,
           ts.seat_number,
           ts.status,
           ts.locked_at,
           ts.lock_expires_at,
           ts.ticket_id,
           COALESCE(s.id, CONCAT('seat-', ts.seat_number)) AS seat_id,
           COALESCE(s.seat_type, 'STANDARD') AS seat_type,
           COALESCE(s.row_position, 'WINDOW') AS row_position,
           COALESCE(s.deck, 'DECK_1') AS deck,
           COALESCE(s.is_priority, 0) AS is_priority
         FROM trip_seats ts
         LEFT JOIN seats s ON ts.seat_id = s.id
         WHERE ts.trip_id = ?
         ORDER BY ts.seat_number ASC`,
        [tripId]
      );
    }

    // 5. Thống kê số lượng ghế theo trạng thái
    const totalSeats = seatRows.length;
    let availableCount = 0;
    let bookedCount = 0;
    let lockedCount = 0;

    const formattedSeats = seatRows.map((row) => {
      const isAvailable = row.status === 'AVAILABLE';
      if (isAvailable) availableCount++;
      else if (row.status === 'BOOKED' || row.status === 'CHECKED_IN') bookedCount++;
      else if (row.status === 'LOCKED') lockedCount++;

      return {
        id: row.seat_id,
        tripSeatId: row.trip_seat_id,
        seatNumber: row.seat_number,
        seatType: row.seat_type,
        rowPosition: row.row_position,
        deck: row.deck,
        isPriority: Boolean(row.is_priority),
        status: row.status,
        isAvailable,
        lockExpiresAt: row.lock_expires_at,
        ticketId: row.ticket_id,
      };
    });

    const responsePayload = {
      tripId: Number(trip.id) || trip.id,
      busPlate: trip.bus_plate,
      busType: trip.bus_type || 'STANDARD',
      totalSeats,
      availableCount,
      bookedCount,
      lockedCount,
      seats: formattedSeats,
    };

    res.status(200).json({
      statusCode: 200,
      success: true,
      message: 'Lấy danh sách sơ đồ ghế chuyến xe thành công!',
      data: responsePayload,
      // Tương thích ngược trực tiếp với frontend hiện tại
      totalSeats,
      availableCount,
      bookedCount,
      seats: formattedSeats,
    });
  } catch (err: any) {
    console.error('Lỗi API getSeatsByTrip:', err);
    res.status(500).json({
      statusCode: 500,
      success: false,
      message: `Lỗi truy vấn CSDL sơ đồ ghế: ${err.message}`,
    });
  }
};

// 2. Khóa giữ chỗ ghế tạm thời (US 03 - Khóa ghế 10 phút để người dùng thanh toán)
export const lockSeat = async (req: Request, res: Response): Promise<void> => {
  try {
    const tripId = req.params.tripId || req.body.tripId;
    const { seatNumber, userId = null, durationMinutes = 10 } = req.body;

    if (!tripId || !seatNumber) {
      res.status(400).json({
        statusCode: 400,
        success: false,
        message: 'tripId và seatNumber là các trường bắt buộc!',
      });
      return;
    }

    // 1. Kiểm tra trạng thái hiện tại của ghế
    const seatRows = await query<any[]>(
      `SELECT id, status, lock_expires_at
       FROM trip_seats
       WHERE trip_id = ? AND seat_number = ?
       LIMIT 1`,
      [tripId, seatNumber]
    );

    if (seatRows.length === 0) {
      res.status(404).json({
        statusCode: 404,
        success: false,
        message: `Ghế ${seatNumber} không tồn tại trên chuyến xe ${tripId}!`,
      });
      return;
    }

    const currentSeat = seatRows[0];
    const now = new Date();

    // Nếu ghế đã đặt hoặc đã lên xe
    if (currentSeat.status === 'BOOKED' || currentSeat.status === 'CHECKED_IN') {
      res.status(409).json({
        statusCode: 409,
        success: false,
        message: `Ghế ${seatNumber} đã được bán và thanh toán thành công!`,
      });
      return;
    }

    // Nếu ghế đang bị khóa và chưa hết hạn
    if (currentSeat.status === 'LOCKED' && currentSeat.lock_expires_at && new Date(currentSeat.lock_expires_at) > now) {
      res.status(409).json({
        statusCode: 409,
        success: false,
        message: `Ghế ${seatNumber} đang có người giữ chỗ thanh toán. Vui lòng chọn ghế khác!`,
      });
      return;
    }

    // 2. Tiến hành khóa ghế
    await query(
      `UPDATE trip_seats
       SET status = 'LOCKED',
           locked_at = NOW(),
           lock_expires_at = DATE_ADD(NOW(), INTERVAL ? MINUTE),
           locked_by_user_id = ?
       WHERE id = ?`,
      [durationMinutes, userId, currentSeat.id]
    );

    const [updatedRows] = await query<any[]>(
      'SELECT id, trip_id, seat_number, status, locked_at, lock_expires_at FROM trip_seats WHERE id = ?',
      [currentSeat.id]
    );

    res.status(200).json({
      statusCode: 200,
      success: true,
      message: `Giữ chỗ ghế ${seatNumber} thành công trong ${durationMinutes} phút!`,
      data: updatedRows,
    });
  } catch (err: any) {
    console.error('Lỗi API lockSeat:', err);
    res.status(500).json({
      statusCode: 500,
      success: false,
      message: `Lỗi giữ chỗ ghế: ${err.message}`,
    });
  }
};

// 3. Mở khóa giữ chỗ ghế (Khi khách đổi ý hoặc hủy thanh toán)
export const unlockSeat = async (req: Request, res: Response): Promise<void> => {
  try {
    const tripId = req.params.tripId || req.body.tripId;
    const { seatNumber } = req.body;

    if (!tripId || !seatNumber) {
      res.status(400).json({
        statusCode: 400,
        success: false,
        message: 'tripId và seatNumber là bắt buộc!',
      });
      return;
    }

    await query(
      `UPDATE trip_seats
       SET status = 'AVAILABLE', locked_at = NULL, lock_expires_at = NULL, locked_by_user_id = NULL
       WHERE trip_id = ? AND seat_number = ? AND status = 'LOCKED'`,
      [tripId, seatNumber]
    );

    res.status(200).json({
      statusCode: 200,
      success: true,
      message: `Đã mở khóa ghế ${seatNumber} thành công!`,
    });
  } catch (err: any) {
    console.error('Lỗi API unlockSeat:', err);
    res.status(500).json({
      statusCode: 500,
      success: false,
      message: `Lỗi mở khóa ghế: ${err.message}`,
    });
  }
};

// 4. Lấy sơ đồ danh mục ghế theo xe buýt (bảng seats)
export const getSeatsByBus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { busId } = req.params;

    const seats = await query<any[]>(
      `SELECT s.id, s.bus_id, s.seat_number, s.seat_type, s.row_position, s.deck, s.is_priority, s.status,
              b.plate_number, b.bus_type
       FROM seats s
       JOIN buses b ON s.bus_id = b.id
       WHERE s.bus_id = ?
       ORDER BY s.seat_number ASC`,
      [busId]
    );

    res.status(200).json({
      statusCode: 200,
      success: true,
      total: seats.length,
      data: seats,
    });
  } catch (err: any) {
    console.error('Lỗi API getSeatsByBus:', err);
    res.status(500).json({
      statusCode: 500,
      success: false,
      message: `Lỗi lấy sơ đồ ghế xe: ${err.message}`,
    });
  }
};

// 5. Lấy danh sách toàn bộ cấu hình ghế trên hệ thống
export const getAllSeats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const seats = await query<any[]>(
      `SELECT s.id, s.bus_id, s.seat_number, s.seat_type, s.row_position, s.deck, s.is_priority, s.status,
              b.plate_number, b.bus_type
       FROM seats s
       JOIN buses b ON s.bus_id = b.id
       ORDER BY s.bus_id ASC, s.seat_number ASC`
    );

    res.status(200).json({
      statusCode: 200,
      success: true,
      total: seats.length,
      data: seats,
    });
  } catch (err: any) {
    console.error('Lỗi API getAllSeats:', err);
    res.status(500).json({
      statusCode: 500,
      success: false,
      message: `Lỗi lấy danh sách ghế: ${err.message}`,
    });
  }
};

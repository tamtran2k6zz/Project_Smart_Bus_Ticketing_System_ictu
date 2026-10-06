import { Response, Router } from 'express';
import { appLogger } from '../config/logger';
import { query } from '../config/database';
import { AuthenticatedRequest, authenticateJWT } from '../middlewares/auth';
import { buildQrPayload, generateTicketQrDataUrl } from '../services/ticket.service';

const router = Router();
const logger = appLogger.child('ticket-details');

router.get(
  '/:ticketCode',
  authenticateJWT,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const rows = await query<any[]>(
        `SELECT t.ticket_code,t.trip_id,t.seat_number,t.fare_amount,t.status,t.user_id,
                passenger.full_name AS passenger_name,
                r.name AS route_name,
                origin.name AS origin_stop,
                destination.name AS destination_stop,
                tr.departure_time,tr.arrival_time,tr.driver_id,tr.bus_plate,
                b.plate_number AS bus_plate_number,b.bus_type,
                driver.full_name AS driver_name,driver.phone_number AS driver_phone
         FROM tickets t
         JOIN trips tr ON tr.id=t.trip_id
         JOIN routes r ON r.id=tr.route_id
         LEFT JOIN users passenger ON passenger.id=t.user_id
         LEFT JOIN buses b ON b.id=tr.bus_id
         LEFT JOIN users driver ON driver.id=tr.driver_id
         LEFT JOIN LATERAL (
           SELECT bs.name
           FROM route_stops rs JOIN bus_stops bs ON bs.id=rs.stop_id
           WHERE rs.route_id=tr.route_id
           ORDER BY rs.stop_order ASC LIMIT 1
         ) origin ON TRUE
         LEFT JOIN LATERAL (
           SELECT bs.name
           FROM route_stops rs JOIN bus_stops bs ON bs.id=rs.stop_id
           WHERE rs.route_id=tr.route_id
           ORDER BY rs.stop_order DESC LIMIT 1
         ) destination ON TRUE
         WHERE t.ticket_code=$1
         LIMIT 1`,
        [req.params.ticketCode.trim()]
      );
      const ticket = rows[0];
      if (!ticket) {
        res.status(404).json({ success: false, message: 'Vé điện tử không tồn tại.' });
        return;
      }

      const isStaff = ['ADMIN', 'MANAGER'].includes(req.user?.role ?? '');
      const isAssignedDriver = req.user?.role === 'DRIVER' && ticket.driver_id === req.user.id;
      if (!isStaff && !isAssignedDriver && ticket.user_id !== req.user?.id) {
        res.status(403).json({ success: false, message: 'Bạn không có quyền xem vé này.' });
        return;
      }

      // Sprint 3: tái sử dụng helper QR của ticket.service để định dạng
      // payload đồng bộ với POST /api/v1/tickets/validate-qr. Kèm exp + nonce
      // + chữ ký HMAC-SHA256 để endpoint kiểm tra hết hạn / chống replay.
      const qrCodeBase64 = await generateTicketQrDataUrl(
        buildQrPayload(ticket, { withSecurity: true })
      );

      res.json({
        ticket_code: ticket.ticket_code,
        seat_code: ticket.seat_number ?? '',
        price: Number(ticket.fare_amount),
        status: ticket.status,
        passenger_name: ticket.passenger_name ?? 'Khách hàng',
        route_name: ticket.route_name ?? '',
        origin_stop: ticket.origin_stop ?? '',
        destination_stop: ticket.destination_stop ?? '',
        departure_time: ticket.departure_time ? new Date(ticket.departure_time).toISOString() : '',
        arrival_time: ticket.arrival_time ? new Date(ticket.arrival_time).toISOString() : '',
        bus_plate_number: ticket.bus_plate || ticket.bus_plate_number || '',
        bus_type: ticket.bus_type ?? '',
        driver_name: ticket.driver_name ?? '',
        driver_phone: ticket.driver_phone ?? '',
        qr_code_base64: qrCodeBase64,
      });
    } catch (error) {
      logger.error('ticket_detail_lookup_failed', {
        table: 'tickets/trips/routes/route_stops/bus_stops',
        ticket_code: req.params.ticketCode,
        user_id: req.user?.id,
        error,
      });
      res.status(500).json({ success: false, message: 'Không thể tải chi tiết vé.' });
    }
  }
);

export default router;

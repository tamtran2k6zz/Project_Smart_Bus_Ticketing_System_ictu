import { Response, Router } from 'express';
import { query } from '../config/database';
import { appLogger } from '../config/logger';
import { AuthenticatedRequest, authenticateJWT } from '../middlewares/auth';
import { authorizeRoles } from '../middlewares/rbac';
import { TicketValidationError, validateTicketQr } from '../services/ticket.service';

const router = Router();
const logger = appLogger.child('tickets');

/**
 * Sprint 3 — US 15: Soát vé QR (validate-qr) & tra cứu log kiểm toán.
 * Mounted tại /api/v1/tickets TRƯỚC ticket-details.routes (GET /:ticketCode)
 * để các endpoint tĩnh không bị route động nuốt mất.
 */

// POST /api/v1/tickets/validate-qr — DRIVER/ADMIN/MANAGER quét mã vé.
router.post(
  '/validate-qr',
  authenticateJWT,
  authorizeRoles('ADMIN', 'MANAGER', 'DRIVER'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (typeof req.body.code !== 'string' || !req.body.code.trim()) {
        res.status(400).json({ success: false, message: 'Vui lòng cung cấp mã vé.' });
        return;
      }
      const result = await validateTicketQr({
        code: req.body.code,
        tripId: typeof req.body.tripId === 'string' ? req.body.tripId : undefined,
        stopId: typeof req.body.stopId === 'string' ? req.body.stopId : undefined,
        latitude: req.body.latitude === undefined ? undefined : Number(req.body.latitude),
        longitude: req.body.longitude === undefined ? undefined : Number(req.body.longitude),
        validatedBy: req.user?.id,
      });
      res.json({ success: true, ...result });
    } catch (error) {
      if (error instanceof TicketValidationError) {
        res.status(error.status).json({ success: false, message: error.message });
        return;
      }
      logger.error('validate_qr_failed', { user_id: req.user?.id, error });
      res.status(500).json({ success: false, message: 'Không thể soát vé.' });
    }
  }
);

// GET /api/v1/tickets/validation-logs — ADMIN/MANAGER tra cứu lịch sử soát vé.
router.get(
  '/validation-logs',
  authenticateJWT,
  authorizeRoles('ADMIN', 'MANAGER'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const tripId = typeof req.query.tripId === 'string' ? req.query.tripId.trim() : '';
      const result = typeof req.query.result === 'string' ? req.query.result.trim() : '';
      const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
      const offset = Math.max(Number(req.query.offset) || 0, 0);

      const conditions: string[] = [];
      const params: unknown[] = [];
      if (tripId) {
        params.push(tripId);
        conditions.push(`v.trip_id = $${params.length}`);
      }
      if (result) {
        params.push(result);
        conditions.push(`v.result = $${params.length}`);
      }
      const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

      params.push(limit, offset);
      const items = await query<any[]>(
        `SELECT v.id, v.ticket_id, v.trip_id, v.result, v.reason, v.latitude, v.longitude,
                v.qr_code_hash, v.created_at,
                v.validated_by, u.full_name AS validated_by_name,
                t.ticket_code, t.seat_number
         FROM ticket_validation_logs v
         LEFT JOIN users u ON u.id = v.validated_by
         LEFT JOIN tickets t ON t.id = v.ticket_id
         ${whereClause}
         ORDER BY v.created_at DESC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      );
      res.json({ success: true, items, limit, offset });
    } catch (error) {
      logger.error('validation_logs_failed', { user_id: req.user?.id, error });
      res.status(500).json({ success: false, message: 'Không thể tải lịch sử soát vé.' });
    }
  }
);

export default router;

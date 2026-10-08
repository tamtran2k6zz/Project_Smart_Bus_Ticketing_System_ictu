import { Response, Router } from 'express';
import { query } from '../config/database';
import { appLogger } from '../config/logger';
import { AuthenticatedRequest, authenticateJWT } from '../middlewares/auth';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/notification.service';

const router = Router();
const logger = appLogger.child('notifications');

/**
 * Sprint 3 — US 10: Thông báo hành khách (xe sắp đến trạm, ...).
 * Mọi endpoint chỉ thao tác trên thông báo của chính người dùng (user_id từ JWT).
 * Prefix: /api/v1/notifications (và /api/notifications).
 */

// GET /api/v1/notifications?unreadOnly=true&limit=20&offset=0
router.get(
  '/',
  authenticateJWT,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const result = await listNotifications(req.user!.id, {
        unreadOnly: req.query.unreadOnly === 'true',
        limit: Number(req.query.limit) || 20,
        offset: Number(req.query.offset) || 0,
      });
      res.json({ success: true, ...result });
    } catch (error) {
      logger.error('notification_list_failed', { user_id: req.user?.id, error });
      res.status(500).json({ success: false, message: 'Không thể tải thông báo.' });
    }
  }
);

// GET /api/v1/notifications/unread-count — badge số thông báo chưa đọc.
router.get(
  '/unread-count',
  authenticateJWT,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const [{ unread_count }] = await query<Array<{ unread_count: number }>>(
        'SELECT count(*)::int AS unread_count FROM notifications WHERE user_id = $1 AND is_read = FALSE',
        [req.user!.id]
      );
      res.json({ success: true, unreadCount: unread_count });
    } catch (error) {
      logger.error('notification_unread_count_failed', { user_id: req.user?.id, error });
      res.status(500).json({ success: false, message: 'Không thể đếm thông báo chưa đọc.' });
    }
  }
);

// POST /api/v1/notifications/read-all — đánh dấu tất cả đã đọc.
router.post(
  '/read-all',
  authenticateJWT,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const updated = await markAllNotificationsRead(req.user!.id);
      res.json({ success: true, updated });
    } catch (error) {
      logger.error('notification_read_all_failed', { user_id: req.user?.id, error });
      res.status(500).json({ success: false, message: 'Không thể đánh dấu đã đọc.' });
    }
  }
);

// POST /api/v1/notifications/:id/read — đánh dấu một thông báo đã đọc.
router.post(
  '/:id/read',
  authenticateJWT,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const notification = await markNotificationRead(req.user!.id, req.params.id);
      if (!notification) {
        res.status(404).json({ success: false, message: 'Thông báo không tồn tại.' });
        return;
      }
      res.json({ success: true, notification });
    } catch (error) {
      logger.error('notification_read_failed', { user_id: req.user?.id, error });
      res.status(500).json({ success: false, message: 'Không thể đánh dấu đã đọc.' });
    }
  }
);

export default router;

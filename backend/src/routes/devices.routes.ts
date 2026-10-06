import { Response, Router } from 'express';
import { appLogger } from '../config/logger';
import { AuthenticatedRequest, authenticateJWT } from '../middlewares/auth';
import {
  DeviceError,
  listDevices,
  registerDevice,
  unregisterDevice,
} from '../services/device.service';

const router = Router();
const logger = appLogger.child('devices');

/**
 * Sprint 3 — US 10: Đăng ký/gỡ device token push (FCM) cho người dùng đã đăng nhập.
 * Prefix: /api/v1/devices (và /api/devices).
 */

// POST /api/v1/devices/register — đăng ký (hoặc chuyển ownership) một device token.
router.post(
  '/register',
  authenticateJWT,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const device = await registerDevice(req.user!.id, {
        deviceToken: req.body.deviceToken,
        platform: req.body.platform,
        deviceName: req.body.deviceName,
      });
      res.status(201).json({ success: true, device });
    } catch (error) {
      if (error instanceof DeviceError) {
        res.status(error.status).json({ success: false, message: error.message });
        return;
      }
      logger.error('device_register_failed', { user_id: req.user?.id, error });
      res.status(500).json({ success: false, message: 'Không thể đăng ký thiết bị.' });
    }
  }
);

// POST /api/v1/devices/unregister — gỡ push trên thiết bị (idempotent).
router.post(
  '/unregister',
  authenticateJWT,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const affected = await unregisterDevice(req.user!.id, req.body.deviceToken);
      res.json({ success: true, affected });
    } catch (error) {
      if (error instanceof DeviceError) {
        res.status(error.status).json({ success: false, message: error.message });
        return;
      }
      logger.error('device_unregister_failed', { user_id: req.user?.id, error });
      res.status(500).json({ success: false, message: 'Không thể gỡ thiết bị.' });
    }
  }
);

// GET /api/v1/devices — danh sách thiết bị đang hoạt động của người dùng.
router.get(
  '/',
  authenticateJWT,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const devices = await listDevices(req.user!.id);
      res.json({ success: true, devices });
    } catch (error) {
      logger.error('device_list_failed', { user_id: req.user?.id, error });
      res.status(500).json({ success: false, message: 'Không thể tải danh sách thiết bị.' });
    }
  }
);

export default router;

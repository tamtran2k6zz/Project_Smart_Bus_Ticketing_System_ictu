import { Router } from 'express';
import { authenticateJWT } from '../middlewares/auth';
import { authorizeRoles } from '../middlewares/rbac';
import { cleanupOldTrips } from '../services/booking';
import { appLogger } from '../config/logger';

const router = Router();
router.post(
  '/cleanup-old-trips',
  authenticateJWT,
  authorizeRoles('ADMIN', 'MANAGER'),
  async (_req, res): Promise<void> => {
    try {
      const oldTripsCleaned = await cleanupOldTrips();
      res.json({
        success: true,
        oldTripsCleaned,
        message: `Đã giải phóng và lưu trữ ${oldTripsCleaned} chuyến hoàn thành. Lịch sử vé và doanh thu được giữ nguyên.`,
      });
    } catch (error: any) {
      appLogger.error('cleanup_old_trips_failed', { error });
      res.status(error.status || 500).json({
        success: false,
        message: error.status ? error.message : 'Không thể giải phóng chuyến xe lúc này.',
      });
    }
  }
);
export default router;

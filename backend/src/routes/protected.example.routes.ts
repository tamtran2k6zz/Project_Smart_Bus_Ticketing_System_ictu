import { Router, Request, Response } from 'express';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { requireRoles, requirePermissions } from '../middlewares/rbac.middleware';

const router = Router();

// Tất cả các routes bên dưới đều yêu cầu đăng nhập hợp lệ
router.use(authenticateJWT);

/**
 * 1. Endpoint dành cho TÀI XẾ / PHỤ XE (US 17: Soát vé QR)
 */
router.post(
  '/tickets/validate-qr',
  requireRoles('DRIVER', 'ADMIN'),
  requirePermissions('ticket:validate_qr'),
  (req: Request, res: Response) => {
    res.json({
      success: true,
      message: 'Xác thực vé thành công.',
      driver: req.user?.fullName,
      validatedAt: new Date().toISOString(),
    });
  }
);

/**
 * 2. Endpoint dành cho QUẢN LÝ (US 21, US 22: Thống kê & Doanh thu)
 */
router.get(
  '/reports/revenue',
  requireRoles('MANAGER', 'ADMIN'),
  (req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        totalRevenue: 154200000,
        currency: 'VND',
        occupancyRate: '87.5%',
        requestedBy: req.user?.email,
      },
    });
  }
);

/**
 * 3. Endpoint dành riêng cho ADMIN (US 24 / US 22: Phân quyền tài khoản)
 * "Là Admin, tôi muốn tạo và phân quyền tài khoản (Admin, Quản lý, Tài xế, Hành khách)"
 */
router.post(
  '/admin/users/:userId/assign-role',
  requireRoles('ADMIN'),
  (req: Request, res: Response) => {
    const { userId } = req.params;
    const { roleCode } = req.body;

    res.json({
      success: true,
      message: `Đã phân quyền ${roleCode} cho người dùng ${userId} thành công.`,
      executedBy: req.user?.fullName,
    });
  }
);

/**
 * 4. Endpoint dành cho HÀNH KHÁCH (US 3, US 4: Xem vé cá nhân)
 */
router.get(
  '/passengers/my-tickets',
  requireRoles('PASSENGER', 'ADMIN'),
  (req: Request, res: Response) => {
    res.json({
      success: true,
      passengerId: req.user?.id,
      tickets: [],
    });
  }
);

export default router;

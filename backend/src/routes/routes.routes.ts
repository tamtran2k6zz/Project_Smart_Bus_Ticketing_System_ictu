import { Router } from 'express';
import {
  getRoutes,
  createRoute,
  updateRoute,
  deleteRoute,
  assignStopToRoute,
} from '../controllers/routes.controller';
import { authenticateJwt } from '../middlewares/auth';
import { requireRoles } from '../middlewares/rbac';

const router = Router();

// Lấy danh sách tuyến xe (Công khai hoặc người dùng đã đăng nhập)
router.get('/', getRoutes);

// Tạo mới tuyến xe (Admin, Manager)
router.post('/', authenticateJwt, requireRoles('ADMIN', 'MANAGER'), createRoute);

// Cập nhật tuyến xe (Admin, Manager)
router.put('/:id', authenticateJwt, requireRoles('ADMIN', 'MANAGER'), updateRoute);
router.patch('/:id', authenticateJwt, requireRoles('ADMIN', 'MANAGER'), updateRoute);

// Xóa tuyến xe (Chỉ Admin)
router.delete('/:id', authenticateJwt, requireRoles('ADMIN'), deleteRoute);

// Gán trạm dừng vào tuyến theo thứ tự (Admin, Manager)
router.post('/:id/stops', authenticateJwt, requireRoles('ADMIN', 'MANAGER'), assignStopToRoute);

export default router;

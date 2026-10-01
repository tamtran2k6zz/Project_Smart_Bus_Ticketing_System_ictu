import { Router } from 'express';
import {
  getStops,
  createStop,
  updateStop,
  deleteStop,
} from '../controllers/stops.controller';
import { authenticateJwt } from '../middlewares/auth';
import { requireRoles } from '../middlewares/rbac';

const router = Router();

// Lấy danh sách trạm dừng xe buýt (Công khai)
router.get('/', getStops);

// Tạo mới trạm dừng (Admin, Manager)
router.post('/', authenticateJwt, requireRoles('ADMIN', 'MANAGER'), createStop);

// Cập nhật trạm dừng (Admin, Manager)
router.put('/:id', authenticateJwt, requireRoles('ADMIN', 'MANAGER'), updateStop);

// Xóa trạm dừng (Chỉ Admin)
router.delete('/:id', authenticateJwt, requireRoles('ADMIN'), deleteStop);

export default router;

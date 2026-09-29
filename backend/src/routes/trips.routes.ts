import { Router } from 'express';
import {
  searchTrips,
  getTrips,
  createTrip,
} from '../controllers/trips.controller';
import { authenticateJwt } from '../middlewares/auth';
import { requireRoles } from '../middlewares/rbac';

const router = Router();

// US 01: Tra cứu chuyến xe theo điểm đi, điểm đến, ngày (Công khai)
router.get('/search', searchTrips);

// Lấy danh sách tất cả các chuyến xe
router.get('/', getTrips);

// Tạo chuyến xe mới (Admin, Manager)
router.post('/', authenticateJwt, requireRoles('ADMIN', 'MANAGER'), createTrip);

export default router;

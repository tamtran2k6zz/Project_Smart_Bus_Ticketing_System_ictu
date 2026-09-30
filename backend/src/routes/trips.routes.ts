import { Router } from 'express';
import {
  searchTrips,
  getTrips,
  createTrip,
} from '../controllers/trips.controller';
import {
  getSeatsByTrip,
  lockSeat,
  unlockSeat,
} from '../controllers/seats.controller';
import { authenticateJwt } from '../middlewares/auth';
import { requireRoles } from '../middlewares/rbac';

const router = Router();

// US 01: Tra cứu chuyến xe theo điểm đi, điểm đến, ngày (Công khai)
router.get('/search', searchTrips);

// Lấy sơ đồ ghế và trạng thái ghế theo chuyến xe (US 02)
router.get('/:tripId/seats', getSeatsByTrip);

// Khóa giữ chỗ ghế 10 phút (US 03)
router.post('/:tripId/seats/lock', lockSeat);

// Mở khóa ghế
router.post('/:tripId/seats/unlock', unlockSeat);

// Lấy danh sách tất cả các chuyến xe
router.get('/', getTrips);

// Tạo chuyến xe mới (Admin, Manager)
router.post('/', authenticateJwt, requireRoles('ADMIN', 'MANAGER'), createTrip);

export default router;

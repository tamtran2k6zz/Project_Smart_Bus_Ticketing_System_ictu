import { authenticateJwt } from '../middlewares/auth';
import { Router } from 'express';
import {
  getSeatsByTrip,
  getSeatsByBus,
  getAllSeats,
  lockSeat,
  unlockSeat,
} from '../controllers/seats.controller';

const router = Router();

// Lấy danh sách toàn bộ cấu hình ghế trong hệ thống
router.get('/', getAllSeats);

// Lấy sơ đồ cấu hình ghế theo xe buýt (buses)
router.get('/bus/:busId', getSeatsByBus);

// Lấy sơ đồ ghế và trạng thái ghế theo chuyến xe (trips)
router.get('/trip/:tripId', getSeatsByTrip);
router.get('/trips/:tripId', getSeatsByTrip);

// Khóa giữ chỗ ghế tạm thời (10 phút)
router.post('/lock', authenticateJwt, lockSeat);

// Mở khóa ghế
router.post('/unlock', authenticateJwt, unlockSeat);

export default router;

import { Router } from 'express';
import { register, login, getMe } from '../controllers/auth.controller';
import { authenticateJWT } from '../middlewares/auth';

const router = Router();

// POST /api/auth/register - Đăng ký tài khoản
router.post('/register', register);

// POST /api/auth/login - Đăng nhập nhận JWT Token
router.post('/login', login);

// GET /api/auth/me - Lấy thông tin tài khoản hiện tại
router.get('/me', authenticateJWT, getMe);

export default router;

import { Router } from 'express';
import { register, login, getMe } from '../controllers/auth.controller';
import { authenticateJWT } from '../middlewares/auth';
import { sendVerificationEmail, verifyEmail } from '../services/email-verification.service';
import type { AuthenticatedRequest } from '../middlewares/auth';

const router = Router();

// POST /api/auth/register - Đăng ký tài khoản
router.post('/register', register);

// POST /api/auth/login - Đăng nhập nhận JWT Token
router.post('/login', login);

// GET /api/auth/me - Lấy thông tin tài khoản hiện tại
router.get('/me', authenticateJWT, getMe);
router.post('/verify-email', async (req, res) => {
  try {
    res.json(await verifyEmail(req.body.token));
  } catch (error: any) {
    res.status(error.status || 500).json({
      success: false,
      message: error.status ? error.message : 'Không xác minh được email.',
    });
  }
});
router.post('/resend-verification', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  try {
    res.json(await sendVerificationEmail(req.user!.id));
  } catch (error: any) {
    res.status(error.status || 500).json({
      success: false,
      message: error.status ? error.message : 'Chưa gửi được email xác minh.',
    });
  }
});

export default router;

import { Router } from 'express';
import { AuthController } from '../modules/auth/auth.controller';

const router = Router();
const authController = new AuthController();

// Public Endpoints
router.post('/register', authController.register);
router.post('/login', authController.login);

export default router;

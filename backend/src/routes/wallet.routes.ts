import { Router, Response } from 'express';
import { authenticateJWT, AuthenticatedRequest } from '../middlewares/auth';
import {
  getWalletByUserId,
  registerWallet,
  getTransactionHistory,
  topupWallet,
  WalletError,
} from '../services/wallet.service';

const router = Router();

router.get('/', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const wallet = await getWalletByUserId(userId);
    if (!wallet) {
      res.json({ success: true, registered: false, wallet: null });
      return;
    }
    res.json({ success: true, registered: true, wallet });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Lỗi khi tải thông tin ví.' });
  }
});

router.post('/register', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { fullName, dateOfBirth, citizenId, bankName, bankAccountNumber } = req.body;
    const wallet = await registerWallet(userId, {
      fullName,
      dateOfBirth,
      citizenId,
      bankName,
      bankAccountNumber,
    });
    res.json({ success: true, message: 'Đăng ký ví điện tử thành công!', wallet });
  } catch (error: any) {
    const status = error instanceof WalletError ? error.statusCode : 500;
    res.status(status).json({ success: false, message: error.message || 'Lỗi đăng ký ví.' });
  }
});

router.get('/transactions', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const transactions = awaitgetTransactionHistory(userId);
    res.json({ success: true, transactions });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Lỗi khi tải lịch sử giao dịch ví.' });
  }
});

router.post('/topup', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { amount, description } = req.body;
    const result = await topupWallet(userId, Number(amount), description || 'Nạp tiền vào ví mô phỏng');
    res.json({ success: true, message: 'Nạp tiền vào ví thành công!', ...result });
  } catch (error: any) {
    const status = error instanceof WalletError ? error.statusCode : 500;
    res.status(status).json({ success: false, message: error.message || 'Lỗi nạp tiền vào ví.' });
  }
});

export default router;

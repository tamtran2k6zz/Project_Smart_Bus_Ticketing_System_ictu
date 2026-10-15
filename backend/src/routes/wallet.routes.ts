import { Router, RequestHandler } from 'express';
import { authenticateJWT, AuthenticatedRequest } from '../middlewares/auth';
import { query } from '../config/database';
import { appLogger } from '../config/logger';
import {
  walletOverview,
  getTransactionHistory,
  registerWallet,
  topupWallet,
  requestWithdrawal,
  reviewWithdrawal,
  WalletError,
} from '../services/wallet.service';
import { buyPassWithWallet, setPassSubscription } from '../services/wallet-pass.service';
const router = Router();
const logger = appLogger.child('wallet');
const action =
  (fn: (req: AuthenticatedRequest) => Promise<unknown>, finance = false): RequestHandler =>
  async (req: AuthenticatedRequest, res) => {
    try {
      if (finance && !['ADMIN', 'FINANCE'].includes(req.user!.role)) {
        res
          .status(403)
          .json({ success: false, message: 'Chỉ tài chính và quản trị viên được xử lý rút tiền.' });
        return;
      }
      res.json(await fn(req));
    } catch (error: any) {
      const status =
        error instanceof WalletError
          ? error.statusCode
          : error.status || (error.code === '23505' ? 409 : 500);
      if (status >= 500) logger.error('wallet_request_failed', { path: req.path, error });
      res.status(status).json({
        success: false,
        message:
          status >= 500
            ? 'Không thể xử lý ví lúc này. Vui lòng thử lại hoặc liên hệ hỗ trợ.'
            : error.code === '23505'
              ? 'Mã giao dịch đã được sử dụng.'
              : error.message,
      });
    }
  };
router.use(authenticateJWT);
router.get(
  '/',
  action(req => walletOverview(req.user!.id))
);
router.get(
  '/transactions',
  action(async req => ({ transactions: await getTransactionHistory(req.user!.id) }))
);
router.post(
  '/register',
  action(async req => ({ wallet: await registerWallet(req.user!.id, req.body) }))
);
router.post(
  '/topup',
  action(req =>
    topupWallet(
      req.user!.id,
      req.body.amount,
      req.body.method,
      req.body.requestKey,
      req.ip || '127.0.0.1'
    )
  )
);
router.post(
  '/withdrawals',
  action(req => requestWithdrawal(req.user!.id, req.body))
);
router.get(
  '/withdrawals/review',
  action(
    () =>
      query(
        `SELECT w.*,u.full_name AS customer_name FROM wallet_withdrawals w JOIN users u ON u.id=w.user_id ORDER BY (w.status='PENDING') DESC,w.created_at DESC LIMIT 100`
      ),
    true
  )
);
router.post(
  '/withdrawals/:id/review',
  action(req => reviewWithdrawal(req.user!.id, req.params.id, req.body), true)
);
router.post(
  '/passes',
  action(req =>
    buyPassWithWallet(req.user!.id, req.body.routeId, req.body.requestKey, req.body.maxAmount)
  )
);
router.put(
  '/subscriptions/:routeId',
  action(req =>
    setPassSubscription(req.user!.id, req.params.routeId, req.body.enabled, req.body.maxAmount)
  )
);
export default router;

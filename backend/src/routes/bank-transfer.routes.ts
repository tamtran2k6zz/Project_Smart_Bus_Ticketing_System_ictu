import { Router, RequestHandler } from 'express';
import { authenticateJWT, AuthenticatedRequest } from '../middlewares/auth';
import { listTransfers, reviewTransfer, submitTransfer } from '../services/bank-transfer.service';
import { appLogger } from '../config/logger';
const router = Router();
const action =
  (fn: (req: AuthenticatedRequest) => Promise<unknown>, finance = false): RequestHandler =>
  async (req: AuthenticatedRequest, res) => {
    try {
      if (finance && !['ADMIN', 'FINANCE'].includes(req.user!.role)) {
        res
          .status(403)
          .json({ success: false, message: 'Chỉ tài chính/admin được đối soát chuyển khoản.' });
        return;
      }
      res.json(await fn(req));
    } catch (error: any) {
      const status = error.status || error.statusCode || (error.code === '23505' ? 409 : 500);
      if (status >= 500) appLogger.error('bank_transfer_request_failed', { path: req.path, error });
      res.status(status).json({
        success: false,
        message:
          status >= 500
            ? 'Không xử lý được chuyển khoản lúc này. Vui lòng thử lại.'
            : error.code === '23505'
              ? 'Mã giao dịch ngân hàng đã được đối soát.'
              : error.message,
      });
    }
  };
router.use(authenticateJWT);
router.post(
  '/:ticketId/submitted',
  action(req => submitTransfer(req.user!.id, req.params.ticketId, req.body.senderReference))
);
router.get(
  '/review',
  action(() => listTransfers(), true)
);
router.post(
  '/:ticketId/review',
  action(req => reviewTransfer(req.user!.id, req.params.ticketId, req.body), true)
);
export default router;

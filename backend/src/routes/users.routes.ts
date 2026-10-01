import { authenticateJWT } from '../middlewares/auth';
import { authorizeRoles } from '../middlewares/rbac';
import { Router, Request, Response } from 'express';
import { query } from '../config/database';

const router = Router();
router.use(authenticateJWT, authorizeRoles('ADMIN','MANAGER'));

// 1. Danh sách người dùng (US 17, US 22)
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await query<any[]>(
      `SELECT id, full_name AS "fullName", email, phone_number AS "phoneNumber",
              role, status, discount_type AS "discountType", discount_status AS "discountStatus",
              created_at AS "createdAt"
       FROM users
       ORDER BY id ASC`
    );

    res.status(200).json({
      statusCode: 200,
      success: true,
      data: users,
    });
  } catch (err: any) {
    console.error('Lỗi API getUsers:', err);
    res.status(500).json({
      statusCode: 500,
      success: false,
      message: `Lỗi truy vấn danh sách người dùng: ${err.message}`,
    });
  }
});

// 2. Xét duyệt ưu đãi HSSV (US 17)
router.patch('/:id/discount-approval', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      res.status(400).json({
        statusCode: 400,
        success: false,
        message: 'Trạng thái duyệt phải là APPROVED hoặc REJECTED',
      });
      return;
    }

    await query(
      'UPDATE users SET discount_status = $1, updated_at = NOW() WHERE id = $2',
      [status, id]
    );

    res.status(200).json({
      statusCode: 200,
      success: true,
      message: `Đã cập nhật trạng thái duyệt ưu đãi thành ${status}`,
    });
  } catch (err: any) {
    console.error('Lỗi duyệt ưu đãi người dùng:', err);
    res.status(500).json({
      statusCode: 500,
      success: false,
      message: `Lỗi cập nhật CSDL: ${err.message}`,
    });
  }
});

export default router;

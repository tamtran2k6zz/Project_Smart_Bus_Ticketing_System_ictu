import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../config/database';

export interface AuthUserPayload {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUserPayload;
}

import { getJwtSecret } from '../config/auth';

// Middleware xác thực JWT Token từ Header Authorization: Bearer <token>
export const authenticateJWT = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      statusCode: 401,
      success: false,
      message: 'Yêu cầu đăng nhập. Thiếu Bearer Token trong tiêu đề Authorization!',
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as AuthUserPayload;
    const [user] = await query<any[]>(
      `SELECT u.*,COALESCE(r.name,u.role) AS current_role FROM users u LEFT JOIN roles r ON r.id=u.role_id WHERE u.id=$1`,
      [decoded.id]
    );
    if (!user || user.status !== 'ACTIVE') {
      res
        .status(401)
        .json({ success: false, message: 'Tài khoản đã khóa hoặc không còn hoạt động.' });
      return;
    }
    req.user = { ...decoded, role: user.current_role, email: user.email, fullName: user.full_name };
    next();
  } catch (err: any) {
    const invalidToken =
      err instanceof jwt.JsonWebTokenError ||
      err instanceof jwt.TokenExpiredError ||
      err instanceof jwt.NotBeforeError;
    res.status(invalidToken ? 401 : 503).json({
      statusCode: invalidToken ? 401 : 503,
      success: false,
      message: invalidToken
        ? 'Token xác thực không hợp lệ hoặc đã hết hạn phiên làm việc!'
        : 'Không thể xác thực tài khoản lúc này. Vui lòng thử lại.',
    });
  }
};

export const authenticateJwt = authenticateJWT;

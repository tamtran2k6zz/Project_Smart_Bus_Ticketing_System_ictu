import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload, AuthenticatedUser } from '../modules/auth/auth.interface';

// Mở rộng interface Request của Express để đính kèm user
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'smartbus-default-secret-change-in-prod';

/**
 * Middleware xác thực Access Token (JWT Bearer Token)
 */
export const authenticateJWT = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      message: 'Token xác thực không được cung cấp hoặc sai định dạng Bearer',
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    // Gắn thông tin người dùng đã xác thực vào context của request
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      phone: decoded.phone,
      fullName: decoded.fullName,
      roles: decoded.roles,
      permissions: decoded.permissions,
    };

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({
        success: false,
        code: 'TOKEN_EXPIRED',
        message: 'Phiên làm việc đã hết hạn. Vui lòng làm mới token.',
      });
      return;
    }

    res.status(401).json({
      success: false,
      code: 'INVALID_TOKEN',
      message: 'Token không hợp lệ hoặc chữ ký đã bị thay đổi.',
    });
  }
};

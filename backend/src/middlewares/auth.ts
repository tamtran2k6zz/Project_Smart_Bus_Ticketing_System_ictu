import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthUserPayload {
  id: number;
  email: string;
  fullName: string;
  role: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUserPayload;
}

const JWT_SECRET = process.env.JWT_SECRET || 'smartbus_jwt_secret_key_sprint1_2026';

// Middleware xác thực JWT Token từ Header Authorization: Bearer <token>
export const authenticateJWT = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
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
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUserPayload;
    req.user = decoded;
    next();
  } catch (err: any) {
    res.status(401).json({
      statusCode: 401,
      success: false,
      message: 'Token xác thực không hợp lệ hoặc đã hết hạn phiên làm việc!',
    });
  }
};

export const authenticateJwt = authenticateJWT;


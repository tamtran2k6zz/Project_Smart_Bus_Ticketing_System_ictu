import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';

// Middleware kiểm tra quyền hạn Role-Based Access Control (RBAC) (US 22)
export const authorizeRoles = (...allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        statusCode: 401,
        success: false,
        message: 'Chưa xác thực danh tính người dùng.',
      });
      return;
    }

    const userRole = req.user.role?.toUpperCase();

    if (!allowedRoles.map((r) => r.toUpperCase()).includes(userRole)) {
      res.status(403).json({
        statusCode: 403,
        success: false,
        message: `Quyền truy cập bị từ chối (403 Forbidden). Vai trò '${req.user.role}' không được phép thực hiện hành động này. Yêu cầu một trong các quyền: [${allowedRoles.join(', ')}]`,
      });
      return;
    }

    next();
  };
};

export const requireRoles = authorizeRoles;
<<<<<<< HEAD
=======

>>>>>>> d49875f (fix(merge): restore rbac middleware and auth/routes/stops route files lost in merge 32c7f3e)

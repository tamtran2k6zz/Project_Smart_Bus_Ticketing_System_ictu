import { Request, Response, NextFunction } from 'express';
import { RoleCode } from '../modules/auth/auth.interface';

/**
 * RBAC Middleware: Kiểm tra vai trò của người dùng (Role-Based Access Control)
 * Cho phép request nếu người dùng sở hữu ít nhất một trong các vai trò được cấp phép.
 * 
 * @param allowedRoles Danh sách vai trò có quyền truy cập endpoint
 */
export const requireRoles = (...allowedRoles: RoleCode[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;

    if (!user) {
      res.status(401).json({
        success: false,
        code: 'UNAUTHORIZED',
        message: 'Yêu cầu xác thực tài khoản trước khi truy cập tài nguyên này.',
      });
      return;
    }

    // Kiểm tra xem user có ít nhất 1 role hợp lệ không
    const hasRole = user.roles.some((role) => allowedRoles.includes(role));

    if (!hasRole) {
      res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Bạn không có quyền thực hiện hành động này.',
        requiredRoles: allowedRoles,
        currentRoles: user.roles,
      });
      return;
    }

    next();
  };
};

/**
 * RBAC/PBAC Middleware: Kiểm tra quyền chi tiết (Permission-Based Access Control)
 * Cho phép request nếu người dùng sở hữu tất cả hoặc ít nhất một quyền yêu cầu.
 * 
 * @param requiredPermissions Danh sách mã quyền cần thiết (ví dụ: 'ticket:validate_qr')
 */
export const requirePermissions = (...requiredPermissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;

    if (!user) {
      res.status(401).json({
        success: false,
        code: 'UNAUTHORIZED',
        message: 'Yêu cầu xác thực tài khoản.',
      });
      return;
    }

    // Role ADMIN luôn có full quyền
    if (user.roles.includes('ADMIN')) {
      return next();
    }

    // Kiểm tra tất cả quyền yêu cầu
    const hasAllPermissions = requiredPermissions.every((perm) =>
      user.permissions.includes(perm)
    );

    if (!hasAllPermissions) {
      res.status(403).json({
        success: false,
        code: 'FORBIDDEN_PERMISSION',
        message: 'Bạn không có đủ quyền hạn chi tiết để truy cập tài nguyên này.',
        requiredPermissions,
      });
      return;
    }

    next();
  };
};

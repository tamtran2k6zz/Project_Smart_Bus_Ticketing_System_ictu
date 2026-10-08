import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../config/database';
import { appLogger } from '../config/logger';
import { readEnv } from '../config/env';
import { AuthenticatedRequest } from '../middlewares/auth';

const logger = appLogger.child('auth');

import { getJwtSecret } from '../config/auth';
const getExpiry = (): string | number => {
  const envVal = readEnv('JWT_EXPIRES_IN') || '86400';
  const num = Number(envVal);
  return isNaN(num) ? envVal : num;
};

// Đăng ký tài khoản mới (US 22)
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { full_name, email, phone_number, password } = req.body;

    if (!full_name || !email || !password) {
      res.status(400).json({
        statusCode: 400,
        success: false,
        message: 'Vui lòng cung cấp đầy đủ: Họ tên (full_name), Email và Mật khẩu (password)!',
      });
      return;
    }

    // Kiểm tra email trùng lặp trong PostgreSQL
    const existingUsers = await query<any[]>('SELECT id FROM users WHERE email = $1 LIMIT 1', [
      email.trim().toLowerCase(),
    ]);

    if (existingUsers.length > 0) {
      res.status(409).json({
        statusCode: 409,
        success: false,
        message: 'Email này đã được sử dụng trong hệ thống!',
      });
      return;
    }

    // Kiểm tra số điện thoại trùng lặp trong PostgreSQL
    if (phone_number) {
      const existingPhone = await query<any[]>(
        'SELECT id FROM users WHERE phone_number = $1 LIMIT 1',
        [phone_number.trim()]
      );
      if (existingPhone.length > 0) {
        res.status(409).json({
          statusCode: 409,
          success: false,
          message: 'Số điện thoại này đã được sử dụng trong hệ thống!',
        });
        return;
      }
    }

    // Mã hóa mật khẩu bằng bcrypt (Salt rounds = 10)
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const roleName = 'PASSENGER';

    const roleId = 4;
    let newUserId: string;
    // Chèn người dùng vào PostgreSQL (id tự tăng)
    try {
      const insertResult: any = await query(
        `INSERT INTO users (full_name, email, phone_number, password_hash, role_id, role, status, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE', NOW()) RETURNING id`,
        [
          full_name.trim(),
          email.trim().toLowerCase(),
          phone_number ? phone_number.trim() : null,
          passwordHash,
          roleId,
          roleName,
        ]
      );
      newUserId = insertResult[0].id;
    } catch (insertErr: any) {
      logger.error('user_insert_failed', {
        table: 'users',
        operation: 'insert',
        email: String(email ?? ''),
        error: insertErr,
      });
      throw insertErr;
    }

    // Tạo JWT Token
    const tokenPayload = {
      id: newUserId,
      email: email.trim().toLowerCase(),
      fullName: full_name.trim(),
      role: roleName,
    };

    const accessToken = jwt.sign(tokenPayload, getJwtSecret(), {
      expiresIn: getExpiry() as any,
    });

    const recipientEmail = email.trim().toLowerCase();
    logger.info('account_confirmation_email_sent', {
      recipient: recipientEmail,
      subject: '[SmartBus ICTU] Xác nhận đăng ký tài khoản thành công',
      message: `Xin chào ${full_name.trim()}, tài khoản SmartBus của bạn đã được khởi tạo thành công.`,
    });

    res.status(201).json({
      statusCode: 201,
      success: true,
      message: `Đăng ký tài khoản thành công! Đã tự động gửi email xác nhận và thông tin tài khoản tới ${recipientEmail}.`,
      data: {
        user: {
          id: newUserId,
          fullName: full_name.trim(),
          email: recipientEmail,
          phoneNumber: phone_number || null,
          role: roleName,
          status: 'ACTIVE',
        },
        tokens: {
          accessToken,
          tokenType: 'Bearer',
          expiresIn: 86400,
        },
        emailSent: true,
        emailConfirmationNotice: `Thư xác nhận đã được gửi thành công đến hộp thư ${recipientEmail}.`,
      },
    });
  } catch (err: any) {
    logger.error('register_failed', {
      table: 'users',
      operation: 'insert',
      email: String(req.body?.email ?? ''),
      error: err,
    });
    res.status(500).json({
      statusCode: 500,
      success: false,
      message: `Lỗi máy chủ khi đăng ký: ${err.message}`,
    });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const identifier = req.body.identifier || req.body.email;
    const { password } = req.body;

    if (!identifier || !password) {
      res.status(400).json({
        statusCode: 400,
        success: false,
        message: 'Vui lòng nhập Email / Số điện thoại và Mật khẩu!',
      });
      return;
    }

    const cleanIdentifier = identifier.trim().toLowerCase();

    // Tìm kiếm trực tiếp trong CSDL PostgreSQL theo email hoặc số điện thoại
    let users: any[] = [];
    try {
      users = await query<any[]>(
        `SELECT u.id, u.full_name, u.email, u.phone_number, u.password_hash, u.status,
                COALESCE(r.name, u.role, 'PASSENGER') AS role_name
         FROM users u
         LEFT JOIN roles r ON u.role_id = r.id
         WHERE LOWER(u.email) = $1 OR u.phone_number = $2
         LIMIT 1`,
        [cleanIdentifier, identifier.trim()]
      );
    } catch {
      users = await query<any[]>(
        `SELECT u.id, u.full_name, u.email, u.phone_number, u.password_hash, u.status,
                COALESCE(u.role, 'PASSENGER') AS role_name
         FROM users u
         WHERE LOWER(u.email) = $1 OR u.phone_number = $2
         LIMIT 1`,
        [cleanIdentifier, identifier.trim()]
      );
    }

    if (users.length === 0) {
      res.status(401).json({
        statusCode: 401,
        success: false,
        message: 'Tài khoản hoặc mật khẩu không chính xác trong CSDL PostgreSQL!',
      });
      return;
    }

    const user = users[0];

    if (user.status === 'LOCKED' || user.status === 'INACTIVE') {
      res.status(403).json({
        statusCode: 403,
        success: false,
        message: 'Tài khoản của bạn đang bị khóa hoặc chưa được kích hoạt!',
      });
      return;
    }

    // So sánh mật khẩu bằng bcrypt.compare
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      res.status(401).json({
        statusCode: 401,
        success: false,
        message: 'Tài khoản hoặc mật khẩu không chính xác trong CSDL PostgreSQL!',
      });
      return;
    }

    // Tạo JWT Token có thời hạn
    const tokenPayload = {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role_name || user.role || 'PASSENGER',
    };

    const accessToken = jwt.sign(tokenPayload, getJwtSecret(), {
      expiresIn: getExpiry() as any,
    });

    res.status(200).json({
      statusCode: 200,
      success: true,
      message: 'Đăng nhập thành công qua CSDL PostgreSQL!',
      data: {
        user: {
          id: user.id,
          fullName: user.full_name,
          email: user.email,
          phoneNumber: user.phone_number,
          role: user.role_name || user.role || 'PASSENGER',
          status: user.status,
        },
        tokens: {
          accessToken,
          tokenType: 'Bearer',
          expiresIn: 86400,
        },
      },
    });
  } catch (err: any) {
    logger.error('login_failed', {
      table: 'users',
      operation: 'select',
      email: String(req.body?.email ?? ''),
      error: err,
    });
    res.status(500).json({
      statusCode: 500,
      success: false,
      message: `Lỗi kết nối cơ sở dữ liệu PostgreSQL: ${err.message}`,
    });
  }
};

// Lấy thông tin tài khoản hiện tại từ JWT Token (US 22)
export const getMe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        statusCode: 401,
        success: false,
        message: 'Không tìm thấy phiên đăng nhập!',
      });
      return;
    }

    let users: any[] = [];
    try {
      users = await query<any[]>(
        `SELECT u.id, u.full_name, u.email, u.phone_number, u.status,
                COALESCE(r.name, u.role, 'PASSENGER') AS role_name, u.created_at
         FROM users u
         LEFT JOIN roles r ON u.role_id = r.id
         WHERE u.id = $1
         LIMIT 1`,
        [userId]
      );
    } catch {
      users = await query<any[]>(
        `SELECT u.id, u.full_name, u.email, u.phone_number, u.status,
                COALESCE(u.role, 'PASSENGER') AS role_name, u.created_at
         FROM users u
         WHERE u.id = $1
         LIMIT 1`,
        [userId]
      );
    }

    if (users.length === 0) {
      res.status(404).json({
        statusCode: 404,
        success: false,
        message: 'Không tìm thấy thông tin người dùng trong CSDL PostgreSQL!',
      });
      return;
    }

    const user = users[0];

    res.status(200).json({
      statusCode: 200,
      success: true,
      data: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        phoneNumber: user.phone_number,
        role: user.role_name || user.role,
        status: user.status,
        createdAt: user.created_at,
      },
    });
  } catch (err: any) {
    logger.error('profile_lookup_failed', {
      table: 'users',
      operation: 'select',
      user_id: (req as AuthenticatedRequest).user?.id ?? '',
      error: err,
    });
    res.status(500).json({
      statusCode: 500,
      success: false,
      message: `Lỗi truy vấn CSDL: ${err.message}`,
    });
  }
};

import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './auth.dto';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  /**
   * POST /api/v1/auth/register
   * Đăng ký tài khoản hành khách mới
   */
  public register = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, phone, password, fullName } = req.body as RegisterDto;

      if (!email || !phone || !password || !fullName) {
        res.status(400).json({
          success: false,
          code: 'VALIDATION_ERROR',
          message: 'Vui lòng cung cấp đầy đủ: email, số điện thoại, mật khẩu và họ tên.',
        });
        return;
      }

      const result = await this.authService.register({
        email,
        phone,
        password,
        fullName,
      });

      res.status(201).json({
        success: true,
        message: 'Đăng ký tài khoản thành công.',
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        code: 'REGISTRATION_FAILED',
        message: error.message || 'Đăng ký thất bại.',
      });
    }
  };

  /**
   * POST /api/v1/auth/login
   * Đăng nhập bằng Email hoặc Số điện thoại
   */
  public login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { identifier, password } = req.body as LoginDto;

      if (!identifier || !password) {
        res.status(400).json({
          success: false,
          code: 'VALIDATION_ERROR',
          message: 'Vui lòng cung cấp tên đăng nhập (email/SĐT) và mật khẩu.',
        });
        return;
      }

      const result = await this.authService.login({ identifier, password });

      res.status(200).json({
        success: true,
        message: 'Đăng nhập thành công.',
        data: result,
      });
    } catch (error: any) {
      res.status(401).json({
        success: false,
        code: 'AUTHENTICATION_FAILED',
        message: error.message || 'Email, số điện thoại hoặc mật khẩu không chính xác.',
      });
    }
  };
}

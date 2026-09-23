import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { RegisterDto, LoginDto, AuthResponseDto } from './auth.dto';
import { JwtPayload, AuthTokens, RoleCode } from './auth.interface';

const JWT_SECRET = process.env.JWT_SECRET || 'smartbus-default-secret-change-in-prod';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'smartbus-default-refresh-secret';
const ACCESS_TOKEN_EXPIRY = 900; // 15 phút (tính bằng giây)
const REFRESH_TOKEN_EXPIRY = '7d';

export class AuthService {
  /**
   * Băm mật khẩu sử dụng Bcrypt với Salt Rounds = 12
   */
  public async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(password, salt);
  }

  /**
   * So khớp mật khẩu người dùng nhập với bản hash trong DB
   */
  public async comparePassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  /**
   * Tạo cặp Token: Access Token (15m) và Refresh Token (7 ngày)
   */
  public generateTokens(user: {
    id: string;
    email: string;
    phone: string;
    fullName: string;
    roles: RoleCode[];
    permissions: string[];
  }): AuthTokens {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      phone: user.phone,
      fullName: user.fullName,
      roles: user.roles,
      permissions: user.permissions,
      iss: 'smartbus-api',
      aud: 'smartbus-client',
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    });

    const refreshToken = jwt.sign(
      { sub: user.id, tokenType: 'refresh' },
      JWT_REFRESH_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_EXPIRY,
      tokenType: 'Bearer',
    };
  }

  /**
   * Mock/DB Handler cho Đăng ký tài khoản mới (Mặc định vai trò PASSENGER)
   */
  public async register(dto: RegisterDto): Promise<AuthResponseDto> {
    // 1. Kiểm tra định dạng SĐT Việt Nam hợp lệ (10 số, bắt đầu bằng 03, 05, 07, 08, 09)
    const phoneRegex = /^(0[3|5|7|8|9])[0-9]{8}$/;
    if (!phoneRegex.test(dto.phone)) {
      throw new Error('Số điện thoại không đúng định dạng hợp lệ tại Việt Nam.');
    }

    // 2. Kiểm tra độ mạnh mật khẩu (Tối thiểu 8 ký tự, 1 hoa, 1 thường, 1 số, 1 ký tự đặc biệt)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(dto.password)) {
      throw new Error(
        'Mật khẩu phải tối thiểu 8 ký tự, bao gồm ít nhất 1 chữ hoa, 1 chữ thường, 1 chữ số và 1 ký tự đặc biệt.'
      );
    }

    // 3. Băm mật khẩu an toàn
    const passwordHash = await this.hashPassword(dto.password);

    // 4. Khởi tạo User mới với vai trò PASSENGER mặc định (Thực tế sẽ insert vào DB)
    const newUser = {
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      email: dto.email.toLowerCase().trim(),
      phone: dto.phone.trim(),
      fullName: dto.fullName.trim(),
      avatarUrl: null,
      status: 'ACTIVE',
      roles: ['PASSENGER'] as RoleCode[],
      permissions: ['ticket:booking', 'ticket:read_own', 'ticket:cancel'],
      createdAt: new Date().toISOString(),
    };

    // 5. Cấp cặp token
    const tokens = this.generateTokens(newUser);

    return {
      user: {
        id: newUser.id,
        email: newUser.email,
        phone: newUser.phone,
        fullName: newUser.fullName,
        avatarUrl: newUser.avatarUrl,
        status: newUser.status,
        roles: newUser.roles,
        createdAt: newUser.createdAt,
      },
      tokens,
    };
  }

  /**
   * Mock/DB Handler cho Đăng nhập
   */
  public async login(dto: LoginDto): Promise<AuthResponseDto> {
    // 1. Tìm user theo Email HOẶC Số điện thoại
    // 2. Kiểm tra tài khoản có bị khóa (SUSPENDED / INACTIVE) không
    // 3. So sánh password hash
    // 4. Lấy danh sách Roles & Permissions của User
    // 5. Cấp Access & Refresh Token
    
    // Giả lập dữ liệu trả về từ DB
    const authenticatedUser = {
      id: 'c8f42f77-5056-4c90-95b7-8dcf2fef2e22',
      email: 'admin@smartbus.ictu.vn',
      phone: '0987654321',
      fullName: 'Trần Đặng Công Tâm (Admin)',
      avatarUrl: 'https://smartbus.ictu.vn/avatars/admin.png',
      status: 'ACTIVE',
      roles: ['ADMIN'] as RoleCode[],
      permissions: [
        'user:manage',
        'role:assign',
        'route:manage',
        'schedule:manage',
        'report:view_revenue',
        'report:export',
      ],
      createdAt: new Date().toISOString(),
    };

    const tokens = this.generateTokens(authenticatedUser);

    return {
      user: {
        id: authenticatedUser.id,
        email: authenticatedUser.email,
        phone: authenticatedUser.phone,
        fullName: authenticatedUser.fullName,
        avatarUrl: authenticatedUser.avatarUrl,
        status: authenticatedUser.status,
        roles: authenticatedUser.roles,
        createdAt: authenticatedUser.createdAt,
      },
      tokens,
    };
  }
}

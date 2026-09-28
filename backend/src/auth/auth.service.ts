import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { UserRole, UserStatus } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const identifier = dto.identifier.trim();

    // Tìm người dùng theo Email hoặc Số điện thoại trong MySQL
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { phoneNumber: identifier }],
      },
    });

    if (!user) {
      throw new UnauthorizedException('Tài khoản hoặc mật khẩu không chính xác!');
    }

    if (user.status === UserStatus.LOCKED) {
      throw new UnauthorizedException('Tài khoản này đã bị khóa. Vui lòng liên hệ Admin!');
    }

    // Xác thực mật khẩu băm bcrypt
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Tài khoản hoặc mật khẩu không chính xác!');
    }

    // Sinh JWT Token
    const payload = {
      sub: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET || 'smart-bus-secret-key-2026',
      expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    });

    // Ghi nhật ký đăng nhập vào bảng activity_logs (US 23)
    await this.prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'USER_LOGIN',
        module: 'AUTH',
        ipAddress: '127.0.0.1',
        userAgent: 'SmartBus Web Client',
      },
    }).catch(() => null);

    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        status: user.status,
        discountType: user.discountType,
        discountStatus: user.discountStatus,
        discountProofUrl: user.discountProofUrl,
      },
      tokens: {
        accessToken,
        tokenType: 'Bearer',
        expiresIn: 86400,
      },
    };
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: dto.email.trim() },
          ...(dto.phoneNumber ? [{ phoneNumber: dto.phoneNumber.trim() }] : []),
        ],
      },
    });

    if (existing) {
      throw new ConflictException('Email hoặc số điện thoại đã được đăng ký trong hệ thống!');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName.trim(),
        email: dto.email.trim(),
        phoneNumber: dto.phoneNumber?.trim() || null,
        passwordHash,
        role: UserRole.PASSENGER,
        status: UserStatus.ACTIVE,
      },
    });

    const payload = {
      sub: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET || 'smart-bus-secret-key-2026',
      expiresIn: '1d',
    });

    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        status: user.status,
      },
      tokens: {
        accessToken,
        tokenType: 'Bearer',
        expiresIn: 86400,
      },
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        monthlyPasses: true,
        notifications: {
          orderBy: { sentAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy thông tin người dùng!');
    }

    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }
}

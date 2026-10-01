import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

/**
 * JwtAuthGuard
 *
 * Guard xác thực JWT Bearer Token cho các API yêu cầu đăng nhập.
 * Header: `Authorization: Bearer <jwt_token>`
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Thiếu Authorization header (định dạng: Bearer <token>)',
      );
    }

    const token = authHeader.slice('Bearer '.length).trim();

    try {
      const payload = await this.jwtService.verifyAsync(token);
      // Gắn payload đã giải mã vào request để các handler phía sau sử dụng.
      (request as any).user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');
    }
  }
}

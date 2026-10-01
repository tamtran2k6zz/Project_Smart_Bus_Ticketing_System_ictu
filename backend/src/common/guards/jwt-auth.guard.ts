import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Optional,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { verify } from 'jsonwebtoken';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(@Optional() private readonly jwtService?: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers?.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Thiếu Authorization Header (Bearer token)!');
    }

    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Định dạng token không hợp lệ! Vui lòng sử dụng Bearer <token>');
    }

    try {
      const secret = process.env.JWT_SECRET || 'smart-bus-secret-key-2026';
      const payload = this.jwtService
        ? this.jwtService.verify(token, { secret })
        : verify(token, secret);
      request.user = payload;
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Token không hợp lệ';
      throw new UnauthorizedException('Token đã hết hạn hoặc không hợp lệ: ' + message);
    }
  }
}

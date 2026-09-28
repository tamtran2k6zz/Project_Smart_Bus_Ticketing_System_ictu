import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { verify } from 'jsonwebtoken';

@Injectable()
export class JwtAuthGuard implements CanActivate {
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
      request.user = verify(token, process.env.JWT_SECRET || 'smart-bus-secret-key-2026');
      return true;
    } catch {
      throw new UnauthorizedException('Token đã hết hạn hoặc không hợp lệ.');
    }
  }
}

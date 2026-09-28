import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService?: JwtService) {}

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
      if (this.jwtService) {
        const payload = this.jwtService.verify(token, {
          secret: process.env.JWT_SECRET || 'smart-bus-secret-key-2026',
        });
        request.user = payload;
      } else {
        const payloadBase64 = token.split('.')[1];
        if (payloadBase64) {
          const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf8');
          request.user = JSON.parse(payloadJson);
        } else {
          throw new UnauthorizedException('Token không hợp lệ!');
        }
      }
      return true;
    } catch (error) {
      throw new UnauthorizedException('Token đã hết hạn hoặc không hợp lệ: ' + error.message);
    }
  }
}

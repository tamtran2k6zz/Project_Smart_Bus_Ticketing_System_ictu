import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { VNPayService } from './services/vnpay.service';
import { MoMoService } from './services/momo.service';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>(
          'JWT_SECRET',
          'smartbus_default_jwt_secret_2026',
        ),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '1d'),
        },
      }),
    }),
  ],
  controllers: [PaymentController],
  providers: [
    PaymentService,
    VNPayService,
    MoMoService,
    PrismaService,
    RedisService,
    JwtAuthGuard,
  ],
  exports: [PaymentService, VNPayService, MoMoService],
})
export class PaymentModule {}


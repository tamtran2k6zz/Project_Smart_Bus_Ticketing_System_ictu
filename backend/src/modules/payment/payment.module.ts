import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { VNPayService } from './services/vnpay.service';
import { MoMoService } from './services/momo.service';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';

@Module({
  controllers: [PaymentController],
  providers: [
    PaymentService,
    VNPayService,
    MoMoService,
    PrismaService,
    RedisService,
  ],
  exports: [PaymentService, VNPayService, MoMoService],
})
export class PaymentModule {}


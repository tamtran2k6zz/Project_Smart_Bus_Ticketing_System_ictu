import { Module } from '@nestjs/common';
import { PrismaModule as SharedPrismaModule } from '../modules/prisma/prisma.module';

@Module({
  imports: [SharedPrismaModule],
  exports: [SharedPrismaModule],
})
export class PrismaModule {}

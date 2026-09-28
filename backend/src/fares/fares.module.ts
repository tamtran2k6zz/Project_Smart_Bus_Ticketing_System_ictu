import { Module } from '@nestjs/common';
import { FaresService } from './fares.service';
import { FaresController } from './fares.controller';
import { PrismaModule } from '../database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FaresController],
  providers: [FaresService],
  exports: [FaresService],
})
export class FaresModule {}

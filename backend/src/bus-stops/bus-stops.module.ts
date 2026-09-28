import { Module } from '@nestjs/common';
import { BusStopsService } from './bus-stops.service';
import { BusStopsController } from './bus-stops.controller';
import { PrismaModule } from '../database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BusStopsController],
  providers: [BusStopsService],
  exports: [BusStopsService],
})
export class BusStopsModule {}

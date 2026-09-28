import { Module } from '@nestjs/common';
import { PrismaModule } from './database/prisma.module';
import { BusStopsModule } from './bus-stops/bus-stops.module';
import { FaresModule } from './fares/fares.module';
import { RoutesModule } from './routes/routes.module';
import { TripsModule } from './modules/trips/trips.module';

@Module({
  imports: [PrismaModule, TripsModule, RoutesModule, BusStopsModule, FaresModule],
})
export class AppModule {}

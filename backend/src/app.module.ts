import { Module } from '@nestjs/common';
import { PrismaModule } from './database/prisma.module';
import { BusStopsModule } from './bus-stops/bus-stops.module';
import { RoutesModule } from './routes/routes.module';
import { FaresModule } from './fares/fares.module';

@Module({
  imports: [
    PrismaModule,
    BusStopsModule,
    RoutesModule,
    FaresModule,
  ],
})
export class AppModule {}

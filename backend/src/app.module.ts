import { Module } from '@nestjs/common';
import { PrismaModule } from './modules/prisma/prisma.module';
import { TripsModule } from './modules/trips/trips.module';
import { RoutesModule } from './modules/routes/routes.module';

@Module({
  imports: [PrismaModule, TripsModule, RoutesModule],
})
export class AppModule {}

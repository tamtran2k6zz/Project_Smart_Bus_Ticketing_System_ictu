import { Module } from '@nestjs/common';
import { PrismaModule } from './modules/prisma/prisma.module';
import { TripsModule } from './modules/trips/trips.module';

@Module({
  imports: [PrismaModule, TripsModule],
})
export class AppModule {}

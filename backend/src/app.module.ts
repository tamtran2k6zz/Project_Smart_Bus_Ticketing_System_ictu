import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './database/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TripsModule } from './modules/trips/trips.module';
import { BusStopsModule } from './bus-stops/bus-stops.module';
import { RoutesModule } from './routes/routes.module';
import { FaresModule } from './fares/fares.module';
import { TicketingModule } from './ticketing/ticketing.module';
import { OperationsModule } from './operations/operations.module';
import { RedisModule } from './redis/redis.module';
import { PaymentModule } from './modules/payment/payment.module';
import { TicketsModule } from './modules/tickets/tickets.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    TripsModule,
    RoutesModule,
    BusStopsModule,
    FaresModule,
    TicketingModule,
    OperationsModule,
    RedisModule,
    PaymentModule,
    TicketsModule,
  ],
})
export class AppModule {}
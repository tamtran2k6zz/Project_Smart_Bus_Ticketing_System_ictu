import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import authRoutes from './routes/auth.routes';
import routesRoutes from './routes/routes.routes';
import stopsRoutes from './routes/stops.routes';
import tripsRoutes from './routes/trips.routes';
import operationsRoutes from './routes/operations.routes';
import ticketingRoutes from './routes/ticketing.routes';
import seatsRoutes from './routes/seats.routes';
import usersRoutes from './routes/users.routes';
import ticketDetailsRoutes from './routes/ticket-details.routes';
import { query } from './config/database';
import { getJwtSecret } from './config/auth';
import { redisStatus, redisSeatLockEnabled } from './config/redis';
import { describeDatabaseTarget, getGatewayCallbacks, readEnv } from './config/env';
import { appLogger } from './config/logger';

const logger = appLogger.child('http');
getJwtSecret();
const app = express();
app.disable('x-powered-by');
app.use(
  cors({
    origin:
      readEnv('CORS_ORIGIN')
        ?.split(',')
        .map(v => v.trim()) || false,
  })
);
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.get('/api/health', async (_req, res) => {
  const database = describeDatabaseTarget();
  const callbacks = getGatewayCallbacks();
  try {
    const [row] = await query<any[]>('SELECT NOW() AS db_time');
    res.json({
      status: 'UP',
      database: 'CONNECTED_POSTGRESQL',
      dbTime: row.db_time,
      target: {
        driver: database.driver,
        host: database.host,
        port: database.port,
        database: database.database,
        poolMax: database.poolMax,
      },
      redis: {
        status: redisStatus(),
        seatLock: redisSeatLockEnabled() ? 'redis-and-postgresql' : 'postgresql-only',
      },
      callbacks: {
        vnpayReturn: callbacks.vnpayReturnUrl,
        vnpayIpn: callbacks.vnpayIpnUrl,
        momoIpn: callbacks.momoIpnUrl,
      },
    });
  } catch (error) {
    logger.error('health_check_failed', {
      table: 'NOW()',
      target: `${database.driver}://${database.host}:${database.port}/${database.database}`,
      error,
    });
    res.status(503).json({
      status: 'DOWN',
      database: 'DISCONNECTED',
      target: {
        driver: database.driver,
        host: database.host,
        port: database.port,
        database: database.database,
      },
    });
  }
});
app.use('/api/auth', authRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/routes', routesRoutes);
app.use('/api/v1/routes', routesRoutes);
app.use('/api/stops', stopsRoutes);
app.use('/api/v1/stops', stopsRoutes);
app.use('/api/trips', tripsRoutes);
app.use('/api/v1/trips', tripsRoutes);
app.use('/api/seats', seatsRoutes);
app.use('/api/v1/seats', seatsRoutes);
app.use('/api/operations', operationsRoutes);
app.use('/api/v1/operations', operationsRoutes);
app.use('/api/ticketing', ticketingRoutes);
app.use('/api/v1/ticketing', ticketingRoutes);
app.use('/api/v1/tickets', ticketDetailsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/v1/users', usersRoutes);

app.use((req, res) => {
  logger.warn('route_not_found', { method: req.method, path: req.originalUrl });
  res.status(404).json({ success: false, message: 'API endpoint not found' });
});
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('unhandled_request_error', {
    method: req.method,
    path: req.originalUrl,
    status: err.status || 500,
    error: err,
  });
  res.status(err.status || 500).json({
    success: false,
    message: err.status === 400 ? 'Invalid JSON' : 'Internal server error',
  });
});
export default app;

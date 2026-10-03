import app from './app';
import pool from './config/database';
import { connectRedis, closeRedis, redisStatus } from './config/redis';
import { collectEnvironmentIssues, logEnvironmentSummary, readEnv } from './config/env';
import { appLogger } from './config/logger';
import { releaseExpiredReservations } from './routes/ticketing.routes';

const logger = appLogger.child('server');
const port = Number(readEnv('PORT') || 5000);

logEnvironmentSummary();

const server = app.listen(port, '0.0.0.0', () =>
  logger.info('api_started', { port, redis: redisStatus() })
);

let cleanupRunning = false;
async function cleanupExpiredReservations(): Promise<void> {
  if (cleanupRunning) return;
  cleanupRunning = true;
  try {
    const count = await releaseExpiredReservations();
    if (count) {
      logger.info('expired_reservations_released', {
        released: count,
        tables: 'tickets/trip_seats/payment_transactions',
      });
    }
  } catch (error) {
    logger.error('reservation_cleanup_failed', {
      tables: 'tickets/trip_seats/payment_transactions',
      error,
    });
  } finally {
    cleanupRunning = false;
  }
}

void connectRedis().catch(error =>
  logger.error('redis_initial_connection_failed', { error })
);
void cleanupExpiredReservations();
const cleanupInterval = setInterval(() => void cleanupExpiredReservations(), 60_000);
cleanupInterval.unref();

process.on('SIGTERM', () => {
  logger.info('shutdown_started', {});
  clearInterval(cleanupInterval);
  server.close(() => {
    void Promise.all([pool.end(), closeRedis()]).then(() =>
      logger.info('shutdown_completed', {})
    );
  });
});

const blockingIssues = collectEnvironmentIssues().filter(issue => issue.level === 'error');
if (blockingIssues.length) {
  logger.error('environment_not_ready', {
    variables: blockingIssues.map(issue => issue.variable).join(','),
  });
}

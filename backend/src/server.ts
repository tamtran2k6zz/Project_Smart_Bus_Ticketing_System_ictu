import app from './app';
import pool from './config/database';
import { connectRedis, closeRedis } from './config/redis';
import { releaseExpiredReservations } from './routes/ticketing.routes';

const port = Number(process.env.PORT || 5000);
const server = app.listen(port, '0.0.0.0', () =>
  console.log(`SmartBus PostgreSQL API listening on port ${port}`)
);

let cleanupRunning = false;
async function cleanupExpiredReservations(): Promise<void> {
  if (cleanupRunning) return;
  cleanupRunning = true;
  try {
    const count = await releaseExpiredReservations();
    if (count) console.log(`[Ticketing] Released ${count} expired reservation(s).`);
  } catch (error) {
    console.error('[Ticketing] Scheduled reservation cleanup failed:', error);
  } finally {
    cleanupRunning = false;
  }
}

void connectRedis().catch(error => console.error('[Redis] Initial connection failed:', error));
void cleanupExpiredReservations();
const cleanupInterval = setInterval(() => void cleanupExpiredReservations(), 60_000);
cleanupInterval.unref();

process.on('SIGTERM', () => {
  clearInterval(cleanupInterval);
  server.close(() => {
    void Promise.all([pool.end(), closeRedis()]);
  });
});

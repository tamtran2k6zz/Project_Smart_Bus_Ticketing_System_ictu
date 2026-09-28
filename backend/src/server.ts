import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import routesRoutes from './routes/routes.routes';
import stopsRoutes from './routes/stops.routes';
import tripsRoutes from './routes/trips.routes';
import operationsRoutes from './routes/operations.routes';
import ticketingRoutes from './routes/ticketing.routes';
import pool, { query } from './config/database';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;

// Middleware cơ bản
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req: Request, _res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
  next();
});

// Health check endpoint kết nối trực tiếp MySQL
app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    const result = await query<any[]>('SELECT 1 + 1 AS health_check, NOW() AS db_time');
    res.status(200).json({
      status: 'UP',
      database: 'CONNECTED_MYSQL_8_0',
      timestamp: new Date().toISOString(),
      dbTime: result[0]?.db_time,
      service: 'Smart Bus Ticketing Backend API',
    });
  } catch (err: any) {
    res.status(503).json({
      status: 'DOWN',
      database: 'DISCONNECTED',
      error: err.message,
    });
  }
});

// API Routes cho Sprint 1 (Hỗ trợ cả /api và /api/v1)
app.use('/api/auth', authRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/routes', routesRoutes);
app.use('/api/v1/routes', routesRoutes);
app.use('/api/stops', stopsRoutes);
app.use('/api/v1/stops', stopsRoutes);
app.use('/api/trips', tripsRoutes);
app.use('/api/v1/trips', tripsRoutes);
app.use('/api/operations', operationsRoutes);
app.use('/api/v1/operations', operationsRoutes);
app.use('/api/ticketing', ticketingRoutes);
app.use('/api/v1/ticketing', ticketingRoutes);

// 404 Route Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    statusCode: 404,
    success: false,
    message: `API endpoint '${req.originalUrl}' không tồn tại trên hệ thống.`,
  });
});

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    statusCode: 500,
    success: false,
    message: 'Lỗi máy chủ nội bộ',
    error: process.env.NODE_ENV === 'production' ? undefined : err.message,
  });
});

// Khởi chạy server
const server = app.listen(PORT, '0.0.0.0', async () => {
  console.log('====================================================');
  console.log(`🚀 Smart Bus Ticketing Backend đang chạy tại: http://localhost:${PORT}`);
  console.log(`📋 Health Check API: http://localhost:${PORT}/api/health`);
  console.log(`🔐 Auth API: http://localhost:${PORT}/api/auth`);
  console.log(`🚍 Routes API: http://localhost:${PORT}/api/routes`);
  console.log(`🚏 Stops API: http://localhost:${PORT}/api/stops`);
  console.log(`🔍 Trips Search API: http://localhost:${PORT}/api/trips/search`);
  console.log('====================================================');

  try {
    const connection = await pool.getConnection();
    console.log('✅ Kết nối trực tiếp cơ sở dữ liệu MySQL thành công!');
    connection.release();
  } catch (err: any) {
    console.warn('⚠️ Cảnh báo: Chưa kết nối được MySQL ngay lập tức. Đang chờ MySQL khởi động...', err.message);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    pool.end();
    console.log('HTTP server closed and MySQL connection pool drained');
  });
});

export default app;

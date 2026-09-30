import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import routesRoutes from './routes/routes.routes';
import stopsRoutes from './routes/stops.routes';
import tripsRoutes from './routes/trips.routes';
import operationsRoutes from './routes/operations.routes';
import ticketingRoutes from './routes/ticketing.routes';
import usersRoutes from './routes/users.routes';
import pool, { query } from './config/database';
import { RedisService } from './redis/redis.service';

dotenv.config();

const redisService = new RedisService();
redisService.start();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;

// Middleware cơ bản
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning', 'x-requested-with'],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req: Request, _res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
  next();
});

// Root Endpoint: Trang chủ điều hướng thông minh & Kết nối giữa Frontend và Backend
app.get('/', (req: Request, res: Response) => {
  if (req.accepts('html')) {
    const host = req.hostname || 'localhost';
    const frontendUrl = `http://${host}:3000`;
    return res.status(200).send(`<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SmartBus — Backend API & System Hub</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Be Vietnam Pro', -apple-system, sans-serif;
      background: linear-gradient(135deg, #0a0f1d 0%, #0d1527 100%);
      color: #f1f5f9;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .hub-card {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.12);
      backdrop-filter: blur(25px);
      -webkit-backdrop-filter: blur(25px);
      border-radius: 24px;
      padding: 44px 36px;
      max-width: 580px;
      width: 100%;
      text-align: center;
      box-shadow: 0 30px 60px -15px rgba(0, 0, 0, 0.7);
    }
    .hub-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 7px 16px;
      background: rgba(34, 197, 94, 0.12);
      border: 1px solid rgba(34, 197, 94, 0.3);
      border-radius: 9999px;
      color: #4ade80;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 24px;
    }
    .hub-badge .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #22c55e;
      box-shadow: 0 0 12px #22c55e;
    }
    h1 {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 12px;
      background: linear-gradient(135deg, #38bdf8 0%, #818cf8 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      letter-spacing: -0.5px;
    }
    p {
      color: #94a3b8;
      font-size: 14px;
      line-height: 1.6;
      margin-bottom: 30px;
    }
    .btn-group {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .btn-primary {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 16px 24px;
      background: linear-gradient(135deg, #0284c7 0%, #4f46e5 100%);
      color: #ffffff;
      text-decoration: none;
      font-weight: 600;
      border-radius: 14px;
      font-size: 15px;
      transition: all 0.25s ease;
      box-shadow: 0 10px 25px -5px rgba(2, 132, 199, 0.5);
    }
    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 15px 30px -5px rgba(2, 132, 199, 0.7);
    }
    .btn-secondary {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 20px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #cbd5e1;
      text-decoration: none;
      font-weight: 500;
      border-radius: 12px;
      font-size: 14px;
      transition: all 0.2s;
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #ffffff;
      border-color: rgba(255, 255, 255, 0.2);
    }
    .endpoints-box {
      margin-top: 28px;
      padding-top: 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      font-size: 12px;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="hub-card">
    <div class="hub-badge"><span class="dot"></span> Backend & MySQL 8.0 Sẵn Sàng</div>
    <h1>SmartBus ICTU System Hub</h1>
    <p>Bạn đang truy cập vào cổng <strong>5000</strong> (Server Backend API). Server đang chạy tốt và đã kết nối cơ sở dữ liệu MySQL 8.0 thành công!</p>
    
    <div class="btn-group">
      <a href="${frontendUrl}" class="btn-primary">
        🌐 Mở Giao Diện Web Đặt Vé (Cổng 3000) ➔
      </a>
      <a href="http://${host}:8080" target="_blank" class="btn-secondary">
        🗄️ Quản lý Database phpMyAdmin (Cổng 8080)
      </a>
      <a href="/api/health" class="btn-secondary">
        ⚡ Kiểm tra trạng thái máy chủ (/api/health)
      </a>
      <a href="/api/stops" class="btn-secondary">
        🚌 API Dữ liệu trạm xe buýt (/api/stops)
      </a>
    </div>

    <div class="endpoints-box">
      Hệ Thống Bán Vé & Điều Hành Xe Buýt Thông Minh — Team 5 (TTCS2026)
    </div>
  </div>
</body>
</html>`);
  }

  res.status(200).json({
    status: 'UP',
    service: 'Smart Bus Ticketing System Backend API',
    database: 'CONNECTED_MYSQL_8_0',
    frontendUrl: 'http://localhost:3000',
    endpoints: {
      health: '/api/health',
      stops: '/api/stops',
      routes: '/api/routes',
      trips: '/api/trips',
      operations: '/api/operations',
      ticketing: '/api/ticketing',
      users: '/api/users',
    },
  });
});

// Health check endpoint kết nối trực tiếp MySQL
app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    const result = await query<any[]>('SELECT 1 + 1 AS health_check, NOW() AS db_time');
    res.status(200).json({
      status: 'UP',
      database: 'CONNECTED_MYSQL_8_0',
      redis: redisService.isReady ? 'CONNECTED' : 'RECONNECTING',
      timestamp: new Date().toISOString(),
      dbTime: result[0]?.db_time,
      service: 'Smart Bus Ticketing Backend API',
    });
  } catch (err: any) {
    res.status(503).json({
      status: 'DOWN',
      database: 'DISCONNECTED',
      redis: redisService.isReady ? 'CONNECTED' : 'RECONNECTING',
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
app.use('/api/users', usersRoutes);
app.use('/api/v1/users', usersRoutes);

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
    console.warn(
      '⚠️ Cảnh báo: Chưa kết nối được MySQL ngay lập tức. Đang chờ MySQL khởi động...',
      err.message
    );
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(async () => {
    try {
      await Promise.all([pool.end(), redisService.onModuleDestroy()]);
      console.log('HTTP server closed and MySQL/Redis connections drained');
    } catch (error) {
      console.error('Error while closing backend connections:', error);
      process.exitCode = 1;
    }
  });
});

export default app;

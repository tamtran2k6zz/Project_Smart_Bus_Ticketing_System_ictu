import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

let host = process.env.DB_HOST || '127.0.0.1';
let port = Number(process.env.DB_PORT) || 3306;
let user = process.env.DB_USER || 'smartbus_user';
let password = process.env.DB_PASSWORD || 'smartbus_pass';
let database = process.env.DB_NAME || 'smartbus_db';

if (process.env.DATABASE_URL) {
  try {
    const url = new URL(process.env.DATABASE_URL);
    host = url.hostname || host;
    port = Number(url.port) || port;
    user = url.username ? decodeURIComponent(url.username) : user;
    password = url.password ? decodeURIComponent(url.password) : password;
    database = url.pathname ? url.pathname.replace(/^\//, '') : database;
  } catch (err: any) {
    console.warn('Không thể parse DATABASE_URL, dùng cấu hình fallback:', err.message);
  }
}

// Nếu có biến môi trường trực tiếp từ Docker Compose (DB_HOST, etc.), ưu tiên sử dụng
if (process.env.DB_HOST) host = process.env.DB_HOST;
if (process.env.DB_PORT) port = Number(process.env.DB_PORT);
if (process.env.DB_USER) user = process.env.DB_USER;
if (process.env.DB_PASSWORD) password = process.env.DB_PASSWORD;
if (process.env.DB_NAME) database = process.env.DB_NAME;

// Cấu hình Connection Pool kết nối trực tiếp CSDL MySQL 8.0 thật
export const dbPool = mysql.createPool({
  host,
  port,
  user,
  password,
  database,
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  enableKeepAlive: true,
  charset: 'utf8mb4',
  dateStrings: true,
});

// Hàm thực thi truy vấn SQL với kiểu trả về tường minh
export async function query<T = any>(sql: string, params: any[] = []): Promise<T> {
  const [rows] = await dbPool.execute(sql, params);
  return rows as T;
}

// Kiểm tra kết nối cơ sở dữ liệu khi khởi động
export async function checkDatabaseConnection(): Promise<void> {
  try {
    const connection = await dbPool.getConnection();
    console.log('✅ [MySQL Database] Kết nối thành công tới cơ sở dữ liệu MySQL thật: smartbus_db');
    connection.release();
  } catch (error: any) {
    console.error('❌ [MySQL Database] Không thể kết nối tới MySQL:', error.message);
  }
}

export default dbPool;

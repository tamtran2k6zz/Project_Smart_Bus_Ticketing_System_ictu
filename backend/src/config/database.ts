import { Pool, PoolClient, types } from 'pg';
import 'dotenv/config';

// IDs use text. Keep API counts and monetary values compatible with the client.
types.setTypeParser(20, Number);
types.setTypeParser(1700, Number);
export const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.DB_POOL_MAX || (process.env.VERCEL ? 2 : 10)),
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 10_000,
  statement_timeout: 15_000,
  application_name: 'smartbus-api',
});
dbPool.on('error', error => console.error('Idle PostgreSQL connection failed:', error.message));
export async function query<T = any>(sql: string, params: any[] = []): Promise<T> {
  return (await dbPool.query(sql, params)).rows as T;
}
export async function transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await dbPool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}
export default dbPool;

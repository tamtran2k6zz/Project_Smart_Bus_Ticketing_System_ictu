import { Pool, PoolClient, types } from 'pg';
import 'dotenv/config';
import { describeDatabaseTarget } from './env';
import { appLogger } from './logger';

const logger = appLogger.child('db');
const target = describeDatabaseTarget();

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
dbPool.on('error', error =>
  logger.error('idle_connection_failed', {
    driver: target.driver,
    host: target.host,
    database: target.database,
    error,
  })
);

/**
 * Best-effort table name for a SQL statement, used only to make logs
 * actionable ("which database, which table, which operation failed").
 */
function statementContext(sql: string): { operation: string; table: string } {
  const normalized = sql.replace(/\s+/g, ' ').trim();
  const operation = (normalized.split(' ')[0] || 'query').toLowerCase();
  const keyword = operation === 'insert' ? 'into' : operation === 'delete' ? 'from' : 'from';
  const pattern = new RegExp(`\\b${keyword}\\s+([a-z_][\\w.]*)`, 'i');
  const match = pattern.exec(normalized);
  return { operation, table: match ? match[1] : '' };
}

export async function query<T = any>(sql: string, params: any[] = []): Promise<T> {
  const startedAt = Date.now();
  const { operation, table } = statementContext(sql);
  try {
    const result = await dbPool.query(sql, params);
    const durationMs = Date.now() - startedAt;
    if (durationMs > 500) {
      logger.warn('slow_query', {
        operation,
        table,
        duration_ms: durationMs,
        rows: result.rowCount ?? result.rows?.length ?? 0,
        database: target.database,
      });
    } else {
      logger.debug('query_ok', {
        operation,
        table,
        duration_ms: durationMs,
        database: target.database,
      });
    }
    return result.rows as T;
  } catch (error) {
    logger.error('query_failed', {
      operation,
      table,
      duration_ms: Date.now() - startedAt,
      database: target.database,
      host: target.host,
      error,
    });
    throw error;
  }
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
    logger.error('transaction_rolled_back', { database: target.database, error });
    throw error;
  } finally {
    client.release();
  }
}
export default dbPool;

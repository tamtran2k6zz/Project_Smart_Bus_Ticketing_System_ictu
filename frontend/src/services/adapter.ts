import { appConfig } from '@/configs/app.config';
import { request } from '@/services/http';
import { transact, type Database } from '@/services/mocks/database';
export function service<T>(
  endpoint: string,
  mock: (db: Database) => T,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  data?: unknown
): Promise<T> {
  return appConfig.demo ? transact(mock) : request<T>(endpoint, method, data);
}

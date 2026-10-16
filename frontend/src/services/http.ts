import axios from 'axios';
import { appConfig } from '@/configs/app.config';
import { rolePermissions } from '@/configs/permissions';
import type { Role } from '@/features/auth/types';
const tokenKey = 'smartbus.accessToken.v1';
export class ApiError extends Error {
  readonly status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}
export function clearAccessToken() {
  sessionStorage.removeItem(tokenKey);
}
export const http = axios.create({
  baseURL: appConfig.apiUrl,
  timeout: 15000,
  withCredentials: false,
  headers: { 'Content-Type': 'application/json' },
});
http.interceptors.request.use(config => {
  const token = sessionStorage.getItem(tokenKey);
  if (token) config.headers.Authorization = 'Bearer ' + token;
  return config;
});
http.interceptors.response.use(
  response => {
    if (typeof response.data === 'string' && response.data.trim().startsWith('<'))
      throw new Error('API trả về HTML; kiểm tra VITE_API_BASE_URL.');
    return response;
  },
  error => {
    if (error.response?.status === 401) clearAccessToken();
    const message = error.response?.data?.message;
    return Promise.reject(
      new ApiError(
        typeof message === 'string'
          ? message
          : error.code === 'ECONNABORTED'
            ? 'Kết nối hết thời gian chờ. Vui lòng thử lại.'
            : 'Không kết nối được dịch vụ. Kiểm tra mạng và địa chỉ API.',
        error.response?.status
      )
    );
  }
);
export async function request<T>(
  path: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  data?: unknown
): Promise<T> {
  const response = await http.request({ url: path, method, data });
  const body = response.data;
  const value = body?.success === true && 'data' in body ? body.data : body;
  if (path.startsWith('/auth/') && (value?.user || value?.fullName)) {
    if (value.tokens?.accessToken) sessionStorage.setItem(tokenKey, value.tokens.accessToken);
    const u = value.user || value;
    return {
      id: u.id,
      name: u.fullName,
      email: u.email,
      phone: u.phoneNumber || '',
      role: u.role,
      active: u.status === 'ACTIVE',
      emailVerified: u.emailVerified === true,
      emailVerificationNotice: value.emailConfirmationNotice,
      emailVerificationSent: typeof value.emailSent === 'boolean' ? value.emailSent : undefined,
      permissions: rolePermissions[u.role as Role] || [],
    } as T;
  }
  if (path === '/auth/logout') clearAccessToken();
  return value as T;
}

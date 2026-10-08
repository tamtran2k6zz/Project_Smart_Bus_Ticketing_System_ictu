import axios from 'axios';
import { appConfig } from '@/configs/app.config';
export const http = axios.create({
  baseURL: appConfig.apiUrl,
  timeout: 15000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});
http.interceptors.response.use(
  response => {
    if (typeof response.data === 'string' && response.data.trim().startsWith('<'))
      throw new Error('API trả về HTML; kiểm tra VITE_API_BASE_URL.');
    return response;
  },
  error => {
    const message = error.response?.data?.message;
    return Promise.reject(
      new Error(
        typeof message === 'string'
          ? message
          : error.code === 'ECONNABORTED'
            ? 'Kết nối hết thời gian chờ. Vui lòng thử lại.'
            : 'Không kết nối được dịch vụ. Kiểm tra mạng và địa chỉ API.'
      )
    );
  }
);
export async function request<T>(
  path: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  data?: unknown
): Promise<T> {
  const response = await http.request<T>({ url: path, method, data });
  return response.data;
}

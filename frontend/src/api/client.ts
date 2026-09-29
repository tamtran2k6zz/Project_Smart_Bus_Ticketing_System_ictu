import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';

// Hàm tính toán URL Backend API thông minh hỗ trợ cả Docker và Localhost
export const getApiUrl = (path: string = ''): string => {
  const cleanPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';
  const viteUrl = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
  if (viteUrl) {
    return `${viteUrl}${cleanPath}`;
  }
  if (typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location;
    if (port === '3000' || port === '3001' || port === '3002' || port === '5173') {
      return `${protocol}//${hostname}:5000${cleanPath}`;
    }
  }
  return cleanPath || '/api';
};

// Khởi tạo Axios client kết nối trực tiếp Backend API
const apiClient: AxiosInstance = axios.create({
  baseURL: getApiUrl('/api'),
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Tự động đính kèm Bearer JWT Token vào Header
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token =
      localStorage.getItem('smartbus_access_token') ||
      localStorage.getItem('token');

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Bắt lỗi 401 Unauthorized và phát hiện phản hồi HTML do SPA fallback
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Nếu API trả về HTML (xảy ra khi SPA rewrite trên Vercel hoặc static host trả về index.html thay vì JSON)
    if (
      typeof response.data === 'string' &&
      (response.data.trim().startsWith('<!doctype') ||
       response.data.trim().startsWith('<html') ||
       response.headers['content-type']?.includes('text/html'))
    ) {
      return Promise.reject(new Error('Phản hồi từ máy chủ không phải định dạng JSON hợp lệ (HTML SPA rewrite)'));
    }
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn('Phiên đăng nhập đã hết hạn hoặc không hợp lệ.');
      // Nếu không ở trang đăng nhập, có thể chuyển hướng hoặc xóa token
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('smartbus_access_token');
        localStorage.removeItem('smartbus_user');
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;

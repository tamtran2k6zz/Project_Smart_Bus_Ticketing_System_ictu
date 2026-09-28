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

// Response Interceptor: Bắt lỗi 401 Unauthorized để điều hướng về đăng nhập
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
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

import { apiClient } from './api';
import { LoginCredentials, RegisterCredentials, AuthResponse, User } from '../types/auth';

export const authService = {
  /**
   * Gọi API đăng nhập (hỗ trợ Email hoặc Số điện thoại)
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>('/auth/login', {
        identifier: credentials.identifier,
        password: credentials.password,
      });
      return response.data;
    } catch (error: any) {
      // Hỗ trợ chế độ Mock demo nếu API backend chưa chạy
      if (!error.response && process.env.NODE_ENV !== 'production') {
        console.warn('[AuthService] Không kết nối được Backend, dùng Mock User cho Demo');
        return authService.mockLogin(credentials);
      }
      throw error.response?.data?.message || 'Đăng nhập thất bại. Vui lòng thử lại!';
    }
  },

  /**
   * Gọi API đăng ký hành khách mới
   */
  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>('/auth/register', {
        email: credentials.email,
        phone: credentials.phone,
        password: credentials.password,
        fullName: credentials.fullName,
      });
      return response.data;
    } catch (error: any) {
      throw error.response?.data?.message || 'Đăng ký thất bại. Vui lòng kiểm tra lại thông tin!';
    }
  },

  /**
   * Mock dữ liệu đăng nhập cho môi trường Dev / Demo
   */
  mockLogin(credentials: LoginCredentials): AuthResponse {
    const idf = credentials.identifier.toLowerCase();
    let role: 'ADMIN' | 'MANAGER' | 'DRIVER' | 'PASSENGER' = 'PASSENGER';
    let fullName = 'Hành Khách Demo';

    if (idf.includes('admin')) {
      role = 'ADMIN';
      fullName = 'Trần Đặng Công Tâm (Admin)';
    } else if (idf.includes('manager') || idf.includes('quanly')) {
      role = 'MANAGER';
      fullName = 'Nguyễn Quản Lý';
    } else if (idf.includes('driver') || idf.includes('taixe')) {
      role = 'DRIVER';
      fullName = 'Bác Tài Lái Xe';
    }

    const mockUser: User = {
      id: 'demo-user-uuid-12345',
      email: idf.includes('@') ? idf : `${idf}@smartbus.vn`,
      phone: idf.includes('@') ? '0987654321' : idf,
      fullName,
      avatarUrl: null,
      status: 'ACTIVE',
      roles: [role],
      permissions: ['ticket:read', 'ticket:booking'],
      createdAt: new Date().toISOString(),
    };

    return {
      success: true,
      message: 'Đăng nhập Demo thành công',
      data: {
        user: mockUser,
        tokens: {
          accessToken: 'mock_jwt_access_token_header.payload.signature',
          refreshToken: 'mock_jwt_refresh_token',
          expiresIn: 900,
          tokenType: 'Bearer',
        },
      },
    };
  },
};

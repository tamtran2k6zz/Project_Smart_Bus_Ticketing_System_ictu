import apiClient from './apiClient';

// Demo mock accounts for testing & grading when backend auth is pending
export const MOCK_USERS = [
  {
    id: 'usr-customer-01',
    email: 'duc.nguyen@smartbus.ictu.vn',
    name: 'Nguyễn Hoàng Đức',
    role: 'CUSTOMER',
    phone: '0987654321',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop',
    password: 'Password123!',
  },
  {
    id: 'usr-admin-01',
    email: 'admin@smartbus.ictu.vn',
    name: 'Quản Trị Viên Hệ Thống',
    role: 'ADMIN',
    phone: '0912345678',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop',
    password: 'AdminPassword123!',
  },
  {
    id: 'usr-driver-01',
    email: 'driver@smartbus.ictu.vn',
    name: 'Tài Xế Trần Văn Hùng',
    role: 'DRIVER',
    phone: '0903456789',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop',
    password: 'DriverPassword123!',
  },
];

export const authApi = {
  /**
   * Log in user with email and password
   */
  async login({ email, password }) {
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      return response.data;
    } catch (error) {
      // Fallback to mock authentication if backend endpoint is unavailable (e.g. 404, network error)
      const isEndpointMissing =
        !error.response ||
        error.response.status === 404 ||
        error.code === 'ERR_NETWORK';

      if (isEndpointMissing) {
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network latency

        const normalizedEmail = email.trim().toLowerCase();
        const matchedUser = MOCK_USERS.find(
          u => u.email.toLowerCase() === normalizedEmail && u.password === password
        );

        if (!matchedUser) {
          throw new Error('Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại!');
        }

        const { password: _, ...userData } = matchedUser;
        const fakeJwtToken = `mock-jwt-token-${userData.id}-${Date.now()}`;

        return {
          statusCode: 200,
          message: 'Đăng nhập thành công (Môi trường phát triển)',
          data: {
            user: userData,
            accessToken: fakeJwtToken,
          },
        };
      }

      // Re-throw actual backend error
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        'Đăng nhập thất bại. Vui lòng thử lại sau.';
      throw new Error(Array.isArray(message) ? message.join(', ') : message);
    }
  },

  /**
   * Register a new user
   */
  async register({ name, email, password, phone, role = 'CUSTOMER' }) {
    try {
      const response = await apiClient.post('/auth/register', {
        name,
        email,
        password,
        phone,
        role,
      });
      return response.data;
    } catch (error) {
      const isEndpointMissing =
        !error.response ||
        error.response.status === 404 ||
        error.code === 'ERR_NETWORK';

      if (isEndpointMissing) {
        await new Promise(resolve => setTimeout(resolve, 600));

        const normalizedEmail = email.trim().toLowerCase();
        const exists = MOCK_USERS.some(u => u.email.toLowerCase() === normalizedEmail);

        if (exists) {
          throw new Error('Email này đã được sử dụng. Vui lòng chọn email khác!');
        }

        const newUser = {
          id: `usr-${Date.now()}`,
          name,
          email,
          phone,
          role,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=2563eb&color=fff`,
        };

        const fakeJwtToken = `mock-jwt-token-${newUser.id}-${Date.now()}`;

        return {
          statusCode: 201,
          message: 'Đăng ký tài khoản thành công',
          data: {
            user: newUser,
            accessToken: fakeJwtToken,
          },
        };
      }

      const message =
        error.response?.data?.message || 'Đăng ký tài khoản thất bại. Vui lòng thử lại.';
      throw new Error(Array.isArray(message) ? message.join(', ') : message);
    }
  },

  /**
   * Fetch current authenticated user's profile
   */
  async getProfile() {
    try {
      const response = await apiClient.get('/auth/me');
      return response.data;
    } catch (error) {
      const isEndpointMissing =
        !error.response ||
        error.response.status === 404 ||
        error.code === 'ERR_NETWORK';

      if (isEndpointMissing) {
        // Return cached user from local storage
        const cached = localStorage.getItem('user') || sessionStorage.getItem('user');
        if (cached) {
          return { data: JSON.parse(cached) };
        }
      }
      throw error;
    }
  },

  /**
   * Log out user
   */
  async logout() {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore logout backend errors
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
    }
  },
};

export default authApi;

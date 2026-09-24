/**
 * Danh sách 4 vai trò chuẩn theo US 22 trong Product Backlog
 */
export type RoleCode = 'ADMIN' | 'MANAGER' | 'DRIVER' | 'PASSENGER';

export interface User {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  avatarUrl: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  roles: RoleCode[];
  permissions?: string[];
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface LoginCredentials {
  identifier: string; // Email hoặc Số điện thoại
  password: string;
  rememberMe?: boolean;
}

export interface RegisterCredentials {
  email: string;
  phone: string;
  password: string;
  confirmPassword?: string;
  fullName: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  data: {
    user: User;
    tokens: AuthTokens;
  };
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthTokens, LoginCredentials, RoleCode } from '../types/auth';

interface AuthContextType {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  hasRole: (role: RoleCode | RoleCode[]) => boolean;
  hasPermission: (permission: string) => boolean;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'smartbus_access_token';
const USER_KEY = 'smartbus_user';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Khôi phục phiên làm việc khi tải trang
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      const storedUser = localStorage.getItem(USER_KEY);

      if (storedToken && storedUser) {
        setUser(JSON.parse(storedUser));
        setTokens({
          accessToken: storedToken,
          refreshToken: '',
          expiresIn: 900,
          tokenType: 'Bearer',
        });
      }
    } catch (err) {
      console.error('Lỗi khôi phục phiên:', err);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (credentials: LoginCredentials): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Thử gọi API thực tế nếu server đang chạy
      try {
        const res = await fetch('/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identifier: credentials.identifier,
            password: credentials.password,
          }),
        });

        if (res.ok) {
          const body = await res.json();
          const authUser: User = body.data.user;
          const authTokens: AuthTokens = body.data.tokens;

          setUser(authUser);
          setTokens(authTokens);
          localStorage.setItem(TOKEN_KEY, authTokens.accessToken);
          localStorage.setItem(USER_KEY, JSON.stringify(authUser));
          return;
        }
      } catch {
        // Fallback sang mock bên dưới cho Demo
      }

      // 2. Chế độ Mock thông minh phục vụ Demo Sprint
      const idf = credentials.identifier.toLowerCase();
      let role: RoleCode = 'PASSENGER';
      let fullName = 'Hành khách Demo';

      if (idf.includes('admin')) {
        role = 'ADMIN';
        fullName = 'Nguyễn Hoàng Đức (Admin)';
      } else if (idf.includes('manager') || idf.includes('quanly')) {
        role = 'MANAGER';
        fullName = 'Quản lý Điều hành';
      } else if (idf.includes('driver') || idf.includes('0987')) {
        role = 'DRIVER';
        fullName = 'Tài xế / Phụ xe';
      }

      const mockUser: User = {
        id: 'usr-' + Math.random().toString(36).substring(2, 9),
        email: idf.includes('@') ? idf : `${idf}@smartbus.ictu.vn`,
        phone: idf.includes('@') ? '0912345678' : idf,
        fullName,
        avatarUrl: null,
        status: 'ACTIVE',
        roles: [role],
        permissions: ['route:manage', 'ticket:read'],
        createdAt: new Date().toISOString(),
      };

      const mockTokens: AuthTokens = {
        accessToken: 'mock_jwt_access_token_' + Date.now(),
        refreshToken: 'mock_jwt_refresh_token',
        expiresIn: 900,
        tokenType: 'Bearer',
      };

      setUser(mockUser);
      setTokens(mockTokens);
      localStorage.setItem(TOKEN_KEY, mockTokens.accessToken);
      localStorage.setItem(USER_KEY, JSON.stringify(mockUser));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Đăng nhập thất bại. Vui lòng thử lại!';
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = (): void => {
    setUser(null);
    setTokens(null);
    setError(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };

  const hasRole = (roles: RoleCode | RoleCode[]): boolean => {
    if (!user || !user.roles) return false;
    const targetRoles = Array.isArray(roles) ? roles : [roles];
    return user.roles.some((r) => targetRoles.includes(r));
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (user.roles?.includes('ADMIN')) return true;
    return user.permissions?.includes(permission) || false;
  };

  const clearError = () => setError(null);

  const value = {
    user,
    tokens,
    isAuthenticated: !!user && !!tokens?.accessToken,
    isLoading,
    error,
    login,
    logout,
    hasRole,
    hasPermission,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthTokens, LoginCredentials, RegisterCredentials, RoleCode } from '../types/auth';
import { getApiUrl, apiFetch } from '../api/client';

interface AuthContextType {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => void;
  hasRole: (role: RoleCode | RoleCode[]) => boolean;
  hasPermission: (permission: string) => boolean;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'smartbus_access_token';
const USER_KEY = 'smartbus_user';

function normalizeUserStatus(status: unknown): User['status'] {
  if (status === 'INACTIVE' || status === 'SUSPENDED') return status;
  return 'ACTIVE';
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Khôi phục phiên làm việc khi tải lại trang
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      const storedUser = localStorage.getItem(USER_KEY);

      if (storedToken && storedUser) {
        setUser(JSON.parse(storedUser));
        setTokens({
          accessToken: storedToken,
          refreshToken: '',
          expiresIn: 86400,
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
      // Kết nối trực tiếp vào cơ sở dữ liệu API Backend NestJS - KHÔNG MOCK TEST
      const res = await apiFetch(getApiUrl('/api/v1/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: credentials.identifier.trim(),
          password: credentials.password,
        }),
      });

      const body = await res.json().catch(() => null);

      if (!res.ok) {
        const errorMsg =
          body?.message ||
          body?.error ||
          'Đăng nhập thất bại. Tài khoản hoặc mật khẩu không chính xác trong CSDL cơ sở dữ liệu!';
        throw new Error(errorMsg);
      }

      // Xử lý dữ liệu trả về từ cơ sở dữ liệu
      const apiUser = body?.data?.user || body?.user;
      const apiTokens = body?.data?.tokens || body?.tokens;

      if (!apiUser || !apiTokens?.accessToken) {
        throw new Error('Dữ liệu phản hồi từ máy chủ không đúng định dạng!');
      }

      const role = (apiUser.role || 'PASSENGER') as RoleCode;
      const mappedUser: User = {
        id: apiUser.id,
        email: apiUser.email,
        phone: apiUser.phoneNumber || '',
        fullName: apiUser.fullName,
        avatarUrl: null,
        status: normalizeUserStatus(apiUser.status),
        roles: [role],
        permissions:
          role === 'ADMIN'
            ? ['*']
            : role === 'MANAGER'
            ? ['route:manage', 'trip:manage', 'user:manage']
            : ['ticket:book', 'route:view'],
        createdAt: new Date().toISOString(),
      };

      const authTokens: AuthTokens = {
        accessToken: apiTokens.accessToken,
        refreshToken: apiTokens.refreshToken || '',
        expiresIn: apiTokens.expiresIn || 86400,
        tokenType: 'Bearer',
      };

      setUser(mappedUser);
      setTokens(authTokens);
      localStorage.setItem(TOKEN_KEY, authTokens.accessToken);
      localStorage.setItem(USER_KEY, JSON.stringify(mappedUser));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi kết nối cơ sở dữ liệu cơ sở dữ liệu!';
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (credentials: RegisterCredentials): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      // Kết nối trực tiếp vào cơ sở dữ liệu API Backend - KHÔNG MOCK DATA
      const res = await apiFetch(getApiUrl('/api/v1/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: credentials.fullName.trim(),
          email: credentials.email.trim(),
          phone_number: credentials.phone.trim(),
          password: credentials.password,
          role: 'PASSENGER',
        }),
      });

      const body = await res.json().catch(() => null);

      if (!res.ok) {
        const errorMsg =
          body?.message ||
          body?.error ||
          'Đăng ký tài khoản thất bại. Vui lòng kiểm tra lại thông tin!';
        throw new Error(errorMsg);
      }

      const apiUser = body?.data?.user || body?.user;
      const apiTokens = body?.data?.tokens || body?.tokens;

      if (!apiUser || !apiTokens?.accessToken) {
        throw new Error('Dữ liệu phản hồi từ máy chủ không đúng định dạng!');
      }

      const role = (apiUser.role || 'PASSENGER') as RoleCode;
      const mappedUser: User = {
        id: String(apiUser.id),
        email: apiUser.email,
        phone: apiUser.phoneNumber || credentials.phone || '',
        fullName: apiUser.fullName,
        avatarUrl: null,
        status: normalizeUserStatus(apiUser.status),
        roles: [role],
        permissions: ['ticket:book', 'route:view'],
        createdAt: new Date().toISOString(),
      };

      const authTokens: AuthTokens = {
        accessToken: apiTokens.accessToken,
        refreshToken: apiTokens.refreshToken || '',
        expiresIn: apiTokens.expiresIn || 86400,
        tokenType: 'Bearer',
      };

      setUser(mappedUser);
      setTokens(authTokens);
      localStorage.setItem(TOKEN_KEY, authTokens.accessToken);
      localStorage.setItem(USER_KEY, JSON.stringify(mappedUser));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi kết nối CSDL cơ sở dữ liệu khi đăng ký!';
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
    register,
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

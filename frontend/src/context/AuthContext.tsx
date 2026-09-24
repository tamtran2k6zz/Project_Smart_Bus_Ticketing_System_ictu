import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthTokens, LoginCredentials, RegisterCredentials, RoleCode } from '../types/auth';
import { authService } from '../services/authService';

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
const REFRESH_TOKEN_KEY = 'smartbus_refresh_token';
const USER_KEY = 'smartbus_user';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Khôi phục phiên đăng nhập từ LocalStorage khi tải trang
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      const storedUser = localStorage.getItem(USER_KEY);

      if (storedToken && storedUser) {
        setUser(JSON.parse(storedUser));
        setTokens({
          accessToken: storedToken,
          refreshToken: storedRefreshToken || '',
          expiresIn: 900,
          tokenType: 'Bearer',
        });
      }
    } catch (err) {
      console.error('Lỗi khôi phục phiên đăng nhập:', err);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (credentials: LoginCredentials): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.login(credentials);
      const { user: authUser, tokens: authTokens } = response.data;

      setUser(authUser);
      setTokens(authTokens);

      // Lưu trữ Token và thông tin cơ bản
      localStorage.setItem(TOKEN_KEY, authTokens.accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, authTokens.refreshToken);
      localStorage.setItem(USER_KEY, JSON.stringify(authUser));
    } catch (err: any) {
      const errMsg = typeof err === 'string' ? err : 'Đăng nhập thất bại. Vui lòng thử lại!';
      setError(errMsg);
      throw new Error(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (credentials: RegisterCredentials): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.register(credentials);
      const { user: authUser, tokens: authTokens } = response.data;

      setUser(authUser);
      setTokens(authTokens);

      localStorage.setItem(TOKEN_KEY, authTokens.accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, authTokens.refreshToken);
      localStorage.setItem(USER_KEY, JSON.stringify(authUser));
    } catch (err: any) {
      const errMsg = typeof err === 'string' ? err : 'Đăng ký tài khoản thất bại.';
      setError(errMsg);
      throw new Error(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = (): void => {
    setUser(null);
    setTokens(null);
    setError(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };

  const hasRole = (roles: RoleCode | RoleCode[]): boolean => {
    if (!user || !user.roles) return false;
    const targetRoles = Array.isArray(roles) ? roles : [roles];
    return user.roles.some((r) => targetRoles.includes(r));
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (user.roles?.includes('ADMIN')) return true; // Admin có toàn quyền
    return user.permissions?.includes(permission) || false;
  };

  const clearError = () => setError(null);

  const value: AuthContextType = {
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

/**
 * Custom Hook sử dụng Auth Context an toàn
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth phải được sử dụng bên trong AuthProvider');
  }
  return context;
};

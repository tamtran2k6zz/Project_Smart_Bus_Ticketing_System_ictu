import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { AuthTokens, LoginCredentials, RegisterCredentials, RoleCode, User } from '../types/auth';
import { setAuthPersistence, supabase } from '../utils/supabase/client';

interface AuthContextType {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  emailConfirmationRequired: boolean;
  login: (credentials: LoginCredentials) => Promise<User>;
  register: (credentials: RegisterCredentials) => Promise<User | null>;
  resendSignupConfirmation: (email: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (role: RoleCode | RoleCode[]) => boolean;
  hasPermission: (permission: string) => boolean;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'smartbus_access_token';
const USER_KEY = 'smartbus_user';

const demoAccounts: Record<
  string,
  { password: string; role: RoleCode; fullName: string; phone: string }
> = {
  'admin@smartbus.ictu.vn': {
    password: 'Admin@2026',
    role: 'ADMIN',
    fullName: 'Nguyễn Hoàng Đức (Admin)',
    phone: '',
  },
  'manager@smartbus.ictu.vn': {
    password: 'Manager@2026',
    role: 'MANAGER',
    fullName: 'Quản lý Điều hành',
    phone: '',
  },
  '0987654321': {
    password: 'Driver@2026',
    role: 'DRIVER',
    fullName: 'Tài xế / Phụ xe',
    phone: '0987654321',
  },
  '0912345678': {
    password: 'Passenger@2026',
    role: 'PASSENGER',
    fullName: 'Hành khách Demo',
    phone: '0912345678',
  },
};

function toAuthUser(authUser: {
  id: string;
  email?: string;
  phone?: string;
  created_at?: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
}): User {
  const appRole = authUser.app_metadata?.role;
  const roles: RoleCode[] =
    typeof appRole === 'string' &&
    ['ADMIN', 'MANAGER', 'DRIVER', 'PASSENGER'].includes(appRole)
      ? [appRole as RoleCode]
      : ['PASSENGER'];

  return {
    id: authUser.id,
    email: authUser.email ?? '',
    phone: authUser.phone ?? '',
    fullName:
      typeof authUser.user_metadata?.full_name === 'string'
        ? authUser.user_metadata.full_name
        : authUser.email ?? authUser.phone ?? 'Hành khách',
    avatarUrl:
      typeof authUser.user_metadata?.avatar_url === 'string'
        ? authUser.user_metadata.avatar_url
        : null,
    status: 'ACTIVE',
    roles,
    createdAt: authUser.created_at ?? new Date().toISOString(),
  };
}

function tokensFromSession(session: {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
}): AuthTokens {
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresIn: session.expires_in ?? 3600,
    tokenType: 'Bearer',
  };
}

function clearDemoSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [emailConfirmationRequired, setEmailConfirmationRequired] = useState(false);

  useEffect(() => {
    let active = true;
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active || localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY)) {
        return;
      }
      setUser(session?.user ? toAuthUser(session.user) : null);
      setTokens(session ? tokensFromSession(session) : null);
    });

    const restoreSession = async () => {
      const demoToken = localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
      const demoUser = localStorage.getItem(USER_KEY) ?? sessionStorage.getItem(USER_KEY);

      if (demoToken?.startsWith('demo-session-') && demoUser) {
        try {
          setUser(JSON.parse(demoUser) as User);
          setTokens({
            accessToken: demoToken,
            refreshToken: '',
            expiresIn: 900,
            tokenType: 'Bearer',
          });
        } catch (restoreError) {
          console.error('Không thể khôi phục phiên demo:', restoreError);
          clearDemoSession();
        }
        setIsLoading(false);
        return;
      }
      clearDemoSession();

      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          throw sessionError;
        }
        if (active && data.session) {
          setUser(toAuthUser(data.session.user));
          setTokens(tokensFromSession(data.session));
        }
      } catch (restoreError) {
        if (active) {
          setError(
            restoreError instanceof Error
              ? restoreError.message
              : 'Không thể khôi phục phiên đăng nhập.',
          );
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void restoreSession();
    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const login = async (credentials: LoginCredentials): Promise<User> => {
    setIsLoading(true);
    setError(null);
    setEmailConfirmationRequired(false);
    try {
      const identifier = credentials.identifier.trim().toLowerCase();
      const demoAccount = demoAccounts[identifier];

      if (demoAccount) {
        if (credentials.password !== demoAccount.password) {
          throw new Error('Tài khoản hoặc mật khẩu không chính xác.');
        }

        const demoUser: User = {
          id: `demo-${identifier}`,
          email: identifier.includes('@') ? identifier : '',
          phone: demoAccount.phone,
          fullName: demoAccount.fullName,
          avatarUrl: null,
          status: 'ACTIVE',
          roles: [demoAccount.role],
          permissions: demoAccount.role === 'ADMIN' ? ['route:manage', 'ticket:read'] : [],
          createdAt: new Date().toISOString(),
        };
        const demoTokens: AuthTokens = {
          accessToken: `demo-session-${Date.now()}`,
          refreshToken: '',
          expiresIn: 900,
          tokenType: 'Bearer',
        };
        const storage = credentials.rememberMe ? localStorage : sessionStorage;
        clearDemoSession();
        storage.setItem(TOKEN_KEY, demoTokens.accessToken);
        storage.setItem(USER_KEY, JSON.stringify(demoUser));
        setUser(demoUser);
        setTokens(demoTokens);
        return demoUser;
      }

      clearDemoSession();
      setAuthPersistence(credentials.rememberMe ?? true);
      const signInInput = identifier.includes('@')
        ? { email: identifier, password: credentials.password }
        : { phone: identifier, password: credentials.password };
      const { data, error: signInError } = await supabase.auth.signInWithPassword(signInInput);
      if (signInError) {
        if (
          signInError.code === 'email_not_confirmed' ||
          signInError.message.toLowerCase().includes('email not confirmed')
        ) {
          setEmailConfirmationRequired(true);
          throw new Error(
            'Email chưa được xác minh. Vui lòng kiểm tra hộp thư hoặc gửi lại email xác minh.',
          );
        }
        throw signInError;
      }
      if (!data.session) {
        throw new Error('Không nhận được phiên đăng nhập. Vui lòng thử lại.');
      }

      const authUser = toAuthUser(data.user);
      setUser(authUser);
      setTokens(tokensFromSession(data.session));
      return authUser;
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Đăng nhập thất bại. Vui lòng kiểm tra thông tin và thử lại.';
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (credentials: RegisterCredentials): Promise<User | null> => {
    setIsLoading(true);
    setError(null);
    setEmailConfirmationRequired(false);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: credentials.email.trim().toLowerCase(),
        password: credentials.password,
        options: {
          data: {
            full_name: credentials.fullName.trim(),
            phone: credentials.phone.trim(),
          },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });
      if (signUpError) {
        throw signUpError;
      }

      if (data.session) {
        const authUser = toAuthUser(data.user);
        setUser(authUser);
        setTokens(tokensFromSession(data.session));
        return authUser;
      }
      return null;
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Đăng ký thất bại. Vui lòng kiểm tra thông tin và thử lại.';
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const resendSignupConfirmation = async (email: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });
      if (resendError) {
        throw resendError;
      }
      setEmailConfirmationRequired(false);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Không thể gửi lại email xác minh.';
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (email: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/login`,
      });
      if (resetError) {
        throw resetError;
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Không thể gửi email đặt lại mật khẩu.';
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    const isDemoSession = Boolean(
      localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY),
    );
    clearDemoSession();
    setUser(null);
    setTokens(null);
    setError(null);
    if (!isDemoSession) {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        setError(signOutError.message);
      }
    }
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
    emailConfirmationRequired,
    login,
    register,
    resendSignupConfirmation,
    resetPassword,
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

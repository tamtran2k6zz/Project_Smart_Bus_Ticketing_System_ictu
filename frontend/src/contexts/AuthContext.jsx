import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/authApi';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Restore authenticated session from storage on app initialization
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const storedToken =
          localStorage.getItem('token') || sessionStorage.getItem('token');
        const storedUser =
          localStorage.getItem('user') || sessionStorage.getItem('user');

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch (err) {
        console.error('Failed to restore auth session:', err);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen for global 401 unauthorized events from apiClient
    const handleUnauthorized = () => {
      setUser(null);
      setToken(null);
      setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  /**
   * Log in user
   */
  const login = useCallback(async ({ email, password, rememberMe = true }) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authApi.login({ email, password });
      const { user: authUser, accessToken } = response.data;

      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem('token', accessToken);
      storage.setItem('user', JSON.stringify(authUser));

      // Clear the other storage just in case
      const otherStorage = rememberMe ? sessionStorage : localStorage;
      otherStorage.removeItem('token');
      otherStorage.removeItem('user');

      setToken(accessToken);
      setUser(authUser);
      return authUser;
    } catch (err) {
      const errorMsg = err.message || 'Đăng nhập không thành công';
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Register new user
   */
  const register = useCallback(
    async ({ name, email, password, phone, role = 'CUSTOMER', rememberMe = true }) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await authApi.register({ name, email, password, phone, role });
        const { user: authUser, accessToken } = response.data;

        const storage = rememberMe ? localStorage : sessionStorage;
        storage.setItem('token', accessToken);
        storage.setItem('user', JSON.stringify(authUser));

        setToken(accessToken);
        setUser(authUser);
        return authUser;
      } catch (err) {
        const errorMsg = err.message || 'Đăng ký tài khoản không thành công';
        setError(errorMsg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Log out user
   */
  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await authApi.logout();
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      setUser(null);
      setToken(null);
      setError(null);
      setIsLoading(false);
    }
  }, []);

  /**
   * Check if current user has any of the required roles
   */
  const hasRole = useCallback(
    requiredRoles => {
      if (!user) return false;
      if (!requiredRoles || requiredRoles.length === 0) return true;
      const rolesArray = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
      return rolesArray.includes(user.role);
    },
    [user]
  );

  /**
   * Update current user profile in state & storage
   */
  const updateProfile = useCallback(updatedFields => {
    setUser(prevUser => {
      if (!prevUser) return null;
      const updated = { ...prevUser, ...updatedFields };
      if (localStorage.getItem('user')) {
        localStorage.setItem('user', JSON.stringify(updated));
      }
      if (sessionStorage.getItem('user')) {
        sessionStorage.setItem('user', JSON.stringify(updated));
      }
      return updated;
    });
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value = {
    user,
    token,
    isAuthenticated: Boolean(user && token),
    isLoading,
    error,
    login,
    register,
    logout,
    hasRole,
    updateProfile,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Custom hook to use AuthContext
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;

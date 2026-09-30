import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { authApi } from '../api/authApi';

// Test Consumer component
const TestConsumer = () => {
  const { user, isAuthenticated, isLoading, login, logout, hasRole, updateProfile } = useAuth();

  return (
    <div>
      <div data-testid="loading">{isLoading ? 'loading' : 'idle'}</div>
      <div data-testid="auth-status">{isAuthenticated ? 'authenticated' : 'guest'}</div>
      <div data-testid="user-email">{user?.email || 'none'}</div>
      <div data-testid="user-role">{user?.role || 'none'}</div>
      <div data-testid="is-admin">{hasRole('ADMIN') ? 'yes' : 'no'}</div>
      <button
        onClick={() =>
          login({
            email: 'duc.nguyen@smartbus.ictu.vn',
            password: 'Password123!',
          })
        }
      >
        Login Customer
      </button>
      <button onClick={() => logout()}>Logout</button>
      <button onClick={() => updateProfile({ name: 'Updated Name' })}>Update Name</button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('provides default unauthenticated state after loading finishes', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('loading').textContent).toBe('idle');
    expect(screen.getByTestId('auth-status').textContent).toBe('guest');
    expect(screen.getByTestId('user-email').textContent).toBe('none');
  });

  it('restores existing session from localStorage', async () => {
    const existingUser = {
      id: 'usr-1',
      name: 'Nguyễn Hoàng Đức',
      email: 'duc.nguyen@smartbus.ictu.vn',
      role: 'CUSTOMER',
    };
    localStorage.setItem('token', 'saved-jwt-token');
    localStorage.setItem('user', JSON.stringify(existingUser));

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('auth-status').textContent).toBe('authenticated');
    expect(screen.getByTestId('user-email').textContent).toBe('duc.nguyen@smartbus.ictu.vn');
    expect(screen.getByTestId('user-role').textContent).toBe('CUSTOMER');
    expect(screen.getByTestId('is-admin').textContent).toBe('no');
  });

  it('successfully logs in, updates state, and saves token', async () => {
    vi.spyOn(authApi, 'login').mockResolvedValueOnce({
      statusCode: 200,
      data: {
        user: {
          id: 'usr-customer-01',
          name: 'Nguyễn Hoàng Đức',
          email: 'duc.nguyen@smartbus.ictu.vn',
          role: 'CUSTOMER',
        },
        accessToken: 'mock-token-xyz',
      },
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await act(async () => {
      screen.getByText('Login Customer').click();
    });

    expect(screen.getByTestId('auth-status').textContent).toBe('authenticated');
    expect(screen.getByTestId('user-email').textContent).toBe('duc.nguyen@smartbus.ictu.vn');
    expect(localStorage.getItem('token')).toBe('mock-token-xyz');
  });

  it('successfully logs out and clears state & storage', async () => {
    localStorage.setItem('token', 'token-to-clear');
    localStorage.setItem(
      'user',
      JSON.stringify({ id: '1', email: 'test@ictu.vn', role: 'CUSTOMER' })
    );

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('auth-status').textContent).toBe('authenticated');

    vi.spyOn(authApi, 'logout').mockResolvedValueOnce({ data: { success: true } });

    await act(async () => {
      screen.getByText('Logout').click();
    });

    expect(screen.getByTestId('auth-status').textContent).toBe('guest');
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('updates profile in state and localStorage', async () => {
    const existingUser = {
      id: 'usr-1',
      name: 'Initial Name',
      email: 'duc@ictu.vn',
      role: 'CUSTOMER',
    };
    localStorage.setItem('token', 'token-123');
    localStorage.setItem('user', JSON.stringify(existingUser));

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await act(async () => {
      screen.getByText('Update Name').click();
    });

    const stored = JSON.parse(localStorage.getItem('user'));
    expect(stored.name).toBe('Updated Name');
  });
});

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import LoginPage from '../pages/auth/LoginPage';
import { authApi } from '../api/authApi';

describe('LoginPage', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  const renderLoginPage = () => {
    return render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<div>Dashboard Page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );
  };

  it('renders login form elements correctly', () => {
    renderLoginPage();

    expect(screen.getByLabelText(/địa chỉ email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^mật khẩu/i, { selector: 'input' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /đăng nhập ngay/i })).toBeInTheDocument();
    expect(screen.getByText(/quên mật khẩu/i)).toBeInTheDocument();
  });

  it('displays client-side validation errors when submitting empty form', async () => {
    renderLoginPage();

    const submitBtn = screen.getByRole('button', { name: /đăng nhập ngay/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/vui lòng nhập địa chỉ email/i)).toBeInTheDocument();
      expect(screen.getByText(/vui lòng nhập mật khẩu/i)).toBeInTheDocument();
    });
  });

  it('auto-fills credentials when clicking Quick Demo button', async () => {
    renderLoginPage();

    const customerDemoBtn = screen.getByRole('button', { name: /hành khách/i });
    fireEvent.click(customerDemoBtn);

    const emailInput = screen.getByLabelText(/địa chỉ email/i);
    const passwordInput = screen.getByLabelText(/^mật khẩu/i, { selector: 'input' });

    expect(emailInput.value).toBe('duc.nguyen@smartbus.ictu.vn');
    expect(passwordInput.value).toBe('Password123!');
  });

  it('submits form and navigates to dashboard on successful login', async () => {
    vi.spyOn(authApi, 'login').mockResolvedValueOnce({
      statusCode: 200,
      data: {
        user: {
          id: 'usr-1',
          name: 'Nguyễn Hoàng Đức',
          email: 'duc.nguyen@smartbus.ictu.vn',
          role: 'CUSTOMER',
        },
        accessToken: 'valid-test-token',
      },
    });

    renderLoginPage();

    // Click demo button to fill
    const customerDemoBtn = screen.getByRole('button', { name: /hành khách/i });
    fireEvent.click(customerDemoBtn);

    const submitBtn = screen.getByRole('button', { name: /đăng nhập ngay/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
    });
  });
});

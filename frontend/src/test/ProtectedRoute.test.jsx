import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import ProtectedRoute from '../routes/ProtectedRoute';

describe('ProtectedRoute', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('redirects unauthenticated user to /login', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<div>Trang Đăng Nhập</div>} />
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<div>Khu vực Bảo vệ</div>} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByText('Trang Đăng Nhập')).toBeInTheDocument();
    expect(screen.queryByText('Khu vực Bảo vệ')).not.toBeInTheDocument();
  });

  it('allows authenticated user to access protected route', () => {
    const user = { id: 'usr-1', email: 'test@ictu.vn', role: 'CUSTOMER' };
    localStorage.setItem('token', 'valid-token');
    localStorage.setItem('user', JSON.stringify(user));

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<div>Trang Đăng Nhập</div>} />
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<div>Khu vực Bảo vệ</div>} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByText('Khu vực Bảo vệ')).toBeInTheDocument();
  });

  it('redirects user lacking required role to /403', () => {
    const customerUser = { id: 'usr-1', email: 'cust@ictu.vn', role: 'CUSTOMER' };
    localStorage.setItem('token', 'valid-token');
    localStorage.setItem('user', JSON.stringify(customerUser));

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AuthProvider>
          <Routes>
            <Route path="/403" element={<div>Lỗi 403: Không có quyền truy cập</div>} />
            <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
              <Route path="/admin" element={<div>Trang Quản Trị Hệ Thống</div>} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByText('Lỗi 403: Không có quyền truy cập')).toBeInTheDocument();
    expect(screen.queryByText('Trang Quản Trị Hệ Thống')).not.toBeInTheDocument();
  });

  it('allows user with ADMIN role to access admin route', () => {
    const adminUser = { id: 'usr-admin', email: 'admin@ictu.vn', role: 'ADMIN' };
    localStorage.setItem('token', 'valid-admin-token');
    localStorage.setItem('user', JSON.stringify(adminUser));

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AuthProvider>
          <Routes>
            <Route path="/403" element={<div>Lỗi 403</div>} />
            <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
              <Route path="/admin" element={<div>Trang Quản Trị Hệ Thống</div>} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByText('Trang Quản Trị Hệ Thống')).toBeInTheDocument();
  });
});

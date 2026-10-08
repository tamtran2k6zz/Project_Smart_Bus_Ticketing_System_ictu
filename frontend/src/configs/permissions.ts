import type { Permission, Role, User } from '@/features/auth/types';
export const rolePermissions: Record<Role, Permission[]> = {
  PASSENGER: [],
  DRIVER: ['check-in'],
  MANAGER: ['operations', 'check-in', 'support', 'eligibility'],
  FINANCE: ['reports', 'promotions'],
  ADMIN: [
    'operations',
    'check-in',
    'reports',
    'promotions',
    'users',
    'audit',
    'support',
    'eligibility',
  ],
};
export const can = (user: User | null | undefined, permission: Permission) =>
  !!user?.active && user.permissions.includes(permission);
export const roleLabels: Record<Role, string> = {
  PASSENGER: 'Hành khách',
  DRIVER: 'Tài xế / phụ xe',
  MANAGER: 'Điều hành',
  FINANCE: 'Tài chính',
  ADMIN: 'Quản trị viên',
};

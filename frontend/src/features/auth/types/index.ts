export type Role = 'PASSENGER' | 'DRIVER' | 'MANAGER' | 'FINANCE' | 'ADMIN';
export type Permission =
  | 'operations'
  | 'check-in'
  | 'reports'
  | 'promotions'
  | 'users'
  | 'audit'
  | 'support'
  | 'eligibility';
export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  active: boolean;
  permissions: Permission[];
}

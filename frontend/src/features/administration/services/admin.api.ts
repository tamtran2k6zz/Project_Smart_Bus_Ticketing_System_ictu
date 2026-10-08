import { service } from '@/services/adapter';
import { audit, requireUser } from '@/services/mocks/database';
import { can, rolePermissions } from '@/configs/permissions';
import type { User, Role, Permission } from '@/features/auth/types';
import type { Audit } from '../types';
export const adminApi = {
  users: (userId: string) =>
    service<User[]>('/users', db => {
      if (!can(requireUser(db, userId), 'users')) throw new Error('Không có quyền.');
      return db.users;
    }),
  drivers: (userId: string) =>
    service<User[]>('/operations/driver-accounts', db => {
      if (!can(requireUser(db, userId), 'operations')) throw new Error('Không có quyền.');
      return db.users.filter(u => u.role === 'DRIVER');
    }),
  update: (actor: string, id: string, role: Role, active: boolean, permissions: Permission[]) =>
    service<User>(
      '/users/' + id,
      db => {
        if (!can(requireUser(db, actor), 'users')) throw new Error('Không có quyền.');
        if (id === actor) throw new Error('Không thay đổi quyền tài khoản đang đăng nhập.');
        const u = db.users.find(u => u.id === id);
        if (!u) throw new Error('Không tìm thấy tài khoản.');
        if (!rolePermissions[role] || permissions.some(p => !rolePermissions[role].includes(p)))
          throw new Error('Quyền không phù hợp vai trò.');
        u.role = role;
        u.active = active;
        u.permissions = permissions;
        audit(db, actor, 'Cập nhật quyền ' + id);
        return u;
      },
      'PUT',
      { role, active, permissions }
    ),
  logs: (userId: string) =>
    service<Audit[]>('/audit-logs', db => {
      if (!can(requireUser(db, userId), 'audit')) throw new Error('Không có quyền.');
      return db.audits;
    }),
};

import { service } from '@/services/adapter';
import { audit, requireUser, uid } from '@/services/mocks/database';
import { rolePermissions } from '@/configs/permissions';
import type { Role, User } from '../types';
export const authApi = {
  session: (id: string) => service<User>('/auth/session', db => requireUser(db, id)),
  login: (email: string, password: string) =>
    service<User>(
      '/auth/login',
      db => {
        const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (!user || db.credentials[user.id] !== password || !user.active)
          throw new Error('Email hoặc mật khẩu không đúng.');
        audit(db, user.name, 'Đăng nhập');
        return user;
      },
      'POST',
      { email, password }
    ),
  demoLogin: (role: Role) => authApi.login(role.toLowerCase() + '@smartbus.demo', 'SmartBus123!'),
  register: (name: string, email: string, phone: string, password: string) =>
    service<User>(
      '/auth/register',
      db => {
        if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase()))
          throw new Error('Email đã được đăng ký.');
        const user: User = {
          id: uid('u'),
          name,
          email,
          phone,
          role: 'PASSENGER',
          active: true,
          permissions: rolePermissions.PASSENGER,
        };
        db.users.push(user);
        db.credentials[user.id] = password;
        audit(db, name, 'Đăng ký');
        return user;
      },
      'POST',
      { name, email, phone, password }
    ),
  forgot: (email: string) =>
    service(
      '/auth/forgot-password',
      () => ({
        message:
          'Yêu cầu khôi phục đã được ghi nhận. Demo không gửi email; tài khoản mẫu dùng SmartBus123!.',
      }),
      'POST',
      { email }
    ),
  profile: (id: string, name: string, phone: string) =>
    service<User>(
      '/auth/profile',
      db => {
        const user = requireUser(db, id);
        user.name = name;
        user.phone = phone;
        audit(db, name, 'Cập nhật hồ sơ');
        return user;
      },
      'PUT',
      { name, phone }
    ),
  logout: () => service('/auth/logout', () => true, 'POST'),
};

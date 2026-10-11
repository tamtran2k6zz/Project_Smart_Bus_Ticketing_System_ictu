import type { Role } from './types';

export interface TestAccount {
  role: Role;
  email: string;
  phone: string;
  password: string;
}

// Existing seed accounts, verified against the database. Never use personal accounts here.
export const apiTestAccounts: TestAccount[] = [
  { role: 'ADMIN', email: 'admin@smartbus.ictu.vn', phone: '0981112233', password: 'Admin@12345' },
  {
    role: 'MANAGER',
    email: 'manager@smartbus.ictu.vn',
    phone: '0982223344',
    password: 'Manager@123',
  },
  { role: 'DRIVER', email: 'driver@smartbus.ictu.vn', phone: '0987654321', password: 'Driver@123' },
  { role: 'PASSENGER', email: 'khachhang@gmail.com', phone: '0912345678', password: 'User@123' },
];

export const demoTestAccounts: TestAccount[] = (
  ['PASSENGER', 'DRIVER', 'MANAGER', 'FINANCE', 'ADMIN'] as Role[]
).map((role, index) => ({
  role,
  email: role.toLowerCase() + '@smartbus.demo',
  phone: '090123456' + index,
  password: 'SmartBus123!',
}));

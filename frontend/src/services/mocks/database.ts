import { appConfig } from '@/configs/app.config';
import { rolePermissions } from '@/configs/permissions';
import type { User } from '@/features/auth/types';
import type {
  Route,
  Stop,
  Vehicle,
  Staff,
  Assignment,
  Incident,
} from '@/features/operations/types';
import type { Booking, Hold, Trip } from '@/features/booking/types';
import type { Ticket } from '@/features/tickets/types';
import type { Payment } from '@/features/payments/types';
import type { Pass, Eligibility } from '@/features/passes/types';
import type { Voucher } from '@/features/promotions/types';
import type { Notification } from '@/features/notifications/types';
import type { SupportRequest } from '@/features/support/types';
import type { Audit } from '@/features/administration/types';
import { localDay } from '@/utils/format';
import { generateStudentCardSvg } from '@/features/passes/utils/studentCardSamples';

export interface Database {
  version: 2;
  users: User[];
  credentials: Record<string, string>;
  routes: Route[];
  stops: Stop[];
  vehicles: Vehicle[];
  staff: Staff[];
  assignments: Assignment[];
  trips: Trip[];
  holds: Hold[];
  bookings: Booking[];
  payments: Payment[];
  tickets: Ticket[];
  passes: Pass[];
  eligibility: Eligibility[];
  vouchers: Voucher[];
  notifications: Notification[];
  subscriptions?: { userId: string; tripId: string; lastNotifiedStop?: string }[];
  support: SupportRequest[];
  incidents: Incident[];
  audits: Audit[];
}

export const uid = (prefix: string) => prefix + '-' + crypto.randomUUID();
export const iso = () => new Date().toISOString();

export function seed(): Database {
  const users: User[] = (['PASSENGER', 'DRIVER', 'MANAGER', 'FINANCE', 'ADMIN'] as const).map(
    (role, i) => ({
      id: 'u' + i,
      name: [
        'Nguyễn Minh Anh',
        'Trần Văn Hùng',
        'Lê Thu Hà',
        'Phạm Thanh Mai',
        'Quản trị SmartBus',
      ][i],
      email: role.toLowerCase() + '@smartbus.demo',
      phone: '090123456' + i,
      role,
      active: true,
      permissions: [...rolePermissions[role]],
    })
  );

  const stops: Stop[] = [
    {
      id: 's1',
      name: 'Bến xe trung tâm Thái Nguyên',
      address: 'Phan Đình Phùng, Thái Nguyên',
      lat: 21.588,
      lng: 105.834,
    },
    {
      id: 's2',
      name: 'Đại học ICTU',
      address: 'Quyết Thắng, Thái Nguyên',
      lat: 21.584,
      lng: 105.796,
    },
    { id: 's3', name: 'Hồ Núi Cốc', address: 'Tân Thái, Thái Nguyên', lat: 21.575, lng: 105.716 },
    { id: 's4', name: 'Sông Công', address: 'Trung tâm Sông Công', lat: 21.491, lng: 105.845 },
  ];

  const routes: Route[] = [
    {
      id: 'r1',
      code: '01',
      name: 'Trung tâm – Đại học ICTU',
      origin: stops[0].name,
      destination: stops[1].name,
      price: 15000,
      stopIds: ['s1', 's2'],
      active: true,
    },
    {
      id: 'r2',
      code: '02',
      name: 'Trung tâm – Hồ Núi Cốc',
      origin: stops[0].name,
      destination: stops[2].name,
      price: 25000,
      stopIds: ['s1', 's2', 's3'],
      active: true,
    },
    {
      id: 'r3',
      code: '03',
      name: 'Trung tâm – Sông Công',
      origin: stops[0].name,
      destination: stops[3].name,
      price: 20000,
      stopIds: ['s1', 's4'],
      active: true,
    },
  ];

  const vehicles: Vehicle[] = [
    { id: 'v1', plate: '20B-012.34', name: 'City Bus 01 - Tuyến 01', capacity: 24, active: true },
    { id: 'v2', plate: '20B-056.78', name: 'City Bus 02 - Tuyến 01', capacity: 30, active: true },
    { id: 'v3', plate: '20B-088.99', name: 'City Bus 03 - Tuyến 02', capacity: 24, active: true },
    { id: 'v4', plate: '20B-034.56', name: 'City Bus 04 - Tuyến 02', capacity: 30, active: true },
    { id: 'v5', plate: '20B-077.88', name: 'City Bus 05 - Tuyến 03', capacity: 30, active: true },
    { id: 'v6', plate: '20B-099.11', name: 'City Bus 06 - Tuyến 03', capacity: 24, active: true },
  ];

  const staff: Staff[] = [
    { id: 'st1', name: 'Trần Văn Hùng', phone: '0901234561', userId: 'u1' },
    { id: 'st2', name: 'Hoàng Văn Nam', phone: '0912345678', userId: 'u1' },
    { id: 'st3', name: 'Đỗ Quốc Tuấn', phone: '0987654321', userId: 'u1' },
    { id: 'st4', name: 'Nguyễn Quang Huy', phone: '0978123456', userId: 'u1' },
  ];

  const assignments: Assignment[] = [
    { id: 'a1', tripId: 't1', vehicleId: 'v2', staffId: 'st1' },
    { id: 'a2', tripId: 't-0-1-1', vehicleId: 'v1', staffId: 'st1' },
  ];

  const trips: Trip[] = [];
  for (let day = 0; day < 8; day++) {
    const dayString = localDay(new Date(Date.now() + day * 86400000));
    routes.forEach((route, i) =>
      [8, 10, 14, 16, 19, 22].forEach((hour, j) => {
        const tripId = day === 0 && j === 0 ? 't' + (i + 1) : 't-' + day + '-' + i + '-' + j;
        trips.push({
          id: tripId,
          routeId: route.id,
          departure: dayString + 'T' + String(hour).padStart(2, '0') + ':30:00+07:00',
          duration: [35, 65, 50][i],
          seatMode: i !== 0,
          vehicleId: i === 1 ? 'v1' : 'v2',
          status: day === 0 && j === 0 ? 'running' : 'scheduled',
          price: route.price,
          capacity: i === 1 ? 24 : 30,
          available: i === 1 ? 24 : 30,
        });
      })
    );
  }

  // Pre-seed realistic student card eligibility profiles with actual front & back SVG card images
  const eligibility: Eligibility[] = [
    {
      id: 'elg-1',
      userId: 'u0',
      fullName: 'Nguyễn Minh Anh',
      category: 'Sinh viên',
      document: 'DTC245220054',
      schoolName: 'Trường Đại học Công nghệ Thông tin & Truyền thông - ICTU',
      facultyOrClass: 'Khoa Công nghệ Thông tin - Lớp D24CNTT01',
      birthDate: '15/09/2005',
      expiryDate: '30/06/2028',
      cardFrontUrl: generateStudentCardSvg({
        fullName: 'Nguyễn Minh Anh',
        studentId: 'DTC245220054',
        schoolName: 'Đại học Công nghệ Thông tin & TT - ICTU',
        facultyOrClass: 'Khoa CNTT - D24CNTT01',
        birthDate: '15/09/2005',
        expiryDate: '30/06/2028',
        cardType: 'THẺ SINH VIÊN',
        themeColor: '#15803d',
      }),
      cardBackUrl: generateStudentCardSvg({
        fullName: 'Nguyễn Minh Anh',
        studentId: 'DTC245220054',
        schoolName: 'Đại học Công nghệ Thông tin & TT - ICTU',
        expiryDate: '30/06/2028',
        isBack: true,
      }),
      submittedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      status: 'pending',
    },
    {
      id: 'elg-2',
      userId: 'u1',
      fullName: 'Trần Văn Hùng',
      category: 'Học sinh',
      document: 'CTN2024-089',
      schoolName: 'Trường THPT Chuyên Thái Nguyên',
      facultyOrClass: 'Lớp 12 Chuyên Tin học',
      birthDate: '20/03/2007',
      expiryDate: '31/05/2027',
      cardFrontUrl: generateStudentCardSvg({
        fullName: 'Trần Văn Hùng',
        studentId: 'CTN2024-089',
        schoolName: 'Trường THPT Chuyên Thái Nguyên',
        facultyOrClass: 'Lớp 12 Chuyên Tin',
        birthDate: '20/03/2007',
        expiryDate: '31/05/2027',
        cardType: 'THẺ HỌC SINH',
        themeColor: '#1d4ed8',
      }),
      cardBackUrl: generateStudentCardSvg({
        fullName: 'Trần Văn Hùng',
        studentId: 'CTN2024-089',
        schoolName: 'Trường THPT Chuyên Thái Nguyên',
        expiryDate: '31/05/2027',
        isBack: true,
      }),
      submittedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
      status: 'pending',
    },
    {
      id: 'elg-3',
      userId: 'u2',
      fullName: 'Lê Thu Hà',
      category: 'Sinh viên',
      document: 'DTS235110023',
      schoolName: 'Trường Đại học Sư Phạm Thái Nguyên',
      facultyOrClass: 'Khoa Ngoại ngữ - K58',
      birthDate: '10/11/2004',
      expiryDate: '30/06/2027',
      cardFrontUrl: generateStudentCardSvg({
        fullName: 'Lê Thu Hà',
        studentId: 'DTS235110023',
        schoolName: 'Đại học Sư Phạm Thái Nguyên',
        facultyOrClass: 'Khoa Ngoại ngữ - K58',
        birthDate: '10/11/2004',
        expiryDate: '30/06/2027',
        cardType: 'THẺ SINH VIÊN',
        themeColor: '#7c3aed',
      }),
      cardBackUrl: generateStudentCardSvg({
        fullName: 'Lê Thu Hà',
        studentId: 'DTS235110023',
        schoolName: 'Đại học Sư Phạm Thái Nguyên',
        expiryDate: '30/06/2027',
        isBack: true,
      }),
      submittedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      status: 'approved',
      reviewedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
      reviewedBy: 'Quản trị SmartBus',
    },
    {
      id: 'elg-4',
      userId: 'u3',
      fullName: 'Phạm Thanh Mai',
      category: 'Sinh viên',
      document: 'DTY225330012',
      schoolName: 'Trường Đại học Y Dược Thái Nguyên',
      facultyOrClass: 'Khoa Dược học - K55',
      birthDate: '05/02/2003',
      expiryDate: '30/06/2025',
      cardFrontUrl: generateStudentCardSvg({
        fullName: 'Phạm Thanh Mai',
        studentId: 'DTY225330012',
        schoolName: 'Đại học Y Dược Thái Nguyên',
        facultyOrClass: 'Khoa Dược học',
        birthDate: '05/02/2003',
        expiryDate: '30/06/2025',
        cardType: 'THẺ SINH VIÊN',
        themeColor: '#0284c7',
      }),
      cardBackUrl: generateStudentCardSvg({
        fullName: 'Phạm Thanh Mai',
        studentId: 'DTY225330012',
        schoolName: 'Đại học Y Dược Thái Nguyên',
        expiryDate: '30/06/2025',
        isBack: true,
      }),
      submittedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      status: 'rejected',
      rejectionReason: 'Thẻ sinh viên đã hết hạn đào tạo (hết hạn ngày 30/06/2025). Vui lòng cập nhật giấy xác nhận sinh viên mới.',
      reviewedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      reviewedBy: 'Quản trị SmartBus',
    },
  ];

  return {
    version: 2,
    users,
    credentials: Object.fromEntries(users.map(u => [u.id, 'SmartBus123!'])),
    stops,
    routes,
    vehicles,
    staff,
    assignments,
    trips,
    holds: [],
    bookings: [],
    payments: [],
    tickets: [],
    passes: [
      {
        id: 'pass-1',
        userId: 'u0',
        routeId: 'r1',
        price: 150000,
        status: 'active',
        expiresAt: new Date(Date.now() + 25 * 86400000).toISOString(),
      },
    ],
    eligibility,
    vouchers: [
      {
        id: 'vc1',
        code: 'SMART10',
        percent: 10,
        expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
        active: true,
      },
      {
        id: 'vc2',
        code: 'HSSV20',
        percent: 20,
        expiresAt: new Date(Date.now() + 60 * 86400000).toISOString(),
        active: true,
      },
    ],
    notifications: [
      {
        id: 'n1',
        userId: 'u0',
        title: 'Chào mừng đến SmartBus',
        body: 'Dữ liệu và các giao dịch trong ứng dụng này đều là mô phỏng.',
        createdAt: iso(),
        read: false,
        href: '/trips',
      },
    ],
    support: [],
    incidents: [
      {
        id: 'inc-1',
        tripId: 't1',
        message: 'Ùn tắc cục bộ tại ngã tư Phan Đình Phùng - Dự kiến trễ 5 phút.',
        createdAt: new Date(Date.now() - 900000).toISOString(),
        resolved: false,
      },
    ],
    audits: [
      {
        id: 'log-1',
        actor: 'Quản trị SmartBus',
        action: 'Khởi động hệ thống điều hành xe buýt SmartBus',
        createdAt: iso(),
      },
    ],
  };
}

export function loadDatabase(): Database {
  try {
    const raw = localStorage.getItem(appConfig.demoStorageKey);
    if (raw) {
      const value = JSON.parse(raw) as Database;
      if (value.version === 2) return value;
    }
  } catch {
    /* Recreate corrupt demo storage. */
  }
  const initial = seed();
  try {
    localStorage.setItem(appConfig.demoStorageKey, JSON.stringify(initial));
  } catch {
    /* ignore storage quota in sandbox */
  }
  return initial;
}

export function refreshHolds(db: Database) {
  db.holds.forEach(h => {
    if (h.status === 'active' && Date.parse(h.expiresAt) <= Date.now()) {
      h.status = 'expired';
      db.bookings
        .filter(b => b.holdId === h.id && b.status !== 'paid' && b.status !== 'canceled')
        .forEach(b => (b.status = 'expired'));
    }
  });
}

export function requireUser(db: Database, userId: string) {
  const user = db.users.find(u => u.id === userId && u.active);
  if (!user) throw new Error('Phiên đã hết hạn hoặc tài khoản bị vô hiệu hóa.');
  return user;
}

export function audit(db: Database, actor: string, action: string) {
  db.audits.unshift({ id: uid('log'), actor, action, createdAt: iso() });
}

export function notify(db: Database, userId: string, title: string, body: string, href: string) {
  db.notifications.unshift({
    id: uid('n'),
    userId,
    title,
    body,
    href,
    createdAt: iso(),
    read: false,
  });
}

export function tripAvailability(db: Database, trip: Trip) {
  const held = db.holds
    .filter(h => h.tripId === trip.id && h.status === 'active')
    .reduce((n, h) => n + h.quantity, 0);
  const booked = db.bookings
    .filter(b => b.tripId === trip.id && b.status === 'paid')
    .reduce((n, b) => n + b.quantity, 0);
  return Math.max(0, trip.capacity - held - booked);
}

// Web Locks serializes transactions across tabs; no await inside the transaction.
export async function transact<T>(work: (db: Database) => T): Promise<T> {
  const run = () => {
    const db = loadDatabase();
    refreshHolds(db);
    const result = work(db);
    try {
      localStorage.setItem(appConfig.demoStorageKey, JSON.stringify(db));
    } catch {
      /* ignore storage quota in sandbox */
    }
    return structuredClone(result);
  };
  if (typeof navigator !== 'undefined' && navigator.locks)
    return navigator.locks.request('smartbus-demo-db', run);
  return run();
}

import { z } from 'zod';
const text = z.string().trim().min(2, 'Nhập ít nhất 2 ký tự');
const number = (min: number, max: number) => z.coerce.number().min(min).max(max);
const id = z.string().min(1, 'Vui lòng chọn');
export const resourceSchemas = {
  routes: z.object({
    name: text,
    code: text,
    origin: text,
    destination: text,
    price: number(1000, 1000000),
    stopIds: z.array(id).min(2),
    active: z.boolean(),
  }),
  stops: z.object({ name: text, address: text, lat: number(-90, 90), lng: number(-180, 180) }),
  vehicles: z.object({
    plate: text,
    name: text,
    capacity: number(1, 80).int(),
    active: z.boolean(),
  }),
  staff: z.object({
    name: text,
    phone: z.string().regex(/^(0|\+84)\d{9}$/, 'Số điện thoại không hợp lệ'),
    userId: id,
  }),
  trips: z.object({
    routeId: id,
    departure: z.string().refine(s => Number.isFinite(Date.parse(s)), 'Ngày giờ không hợp lệ'),
    duration: number(5, 500),
    seatMode: z.boolean(),
    vehicleId: id,
    status: z.enum(['scheduled', 'running', 'completed']),
  }),
  assignments: z.object({ tripId: id, vehicleId: id, staffId: id }),
};

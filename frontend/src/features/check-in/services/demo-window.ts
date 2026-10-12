import type { CheckInWindow, Trip } from '@/features/booking/types';
import { dateTime } from '@/utils/format';

/** Local clock is used only by the explicit demo; the real API supplies its own window. */
export function demoCheckInWindow(trip: Trip, now = Date.now()): CheckInWindow {
  const departure = Date.parse(trip.departure);
  const valid = Number.isFinite(departure) && Number.isFinite(trip.duration) && trip.duration > 0;
  const opensAt = valid ? new Date(departure - 30 * 60000).toISOString() : null;
  const closesAt = valid ? new Date(departure + (trip.duration + 90) * 60000).toISOString() : null;
  const base = { opensAt, closesAt, serverTime: new Date(now).toISOString() };
  if (trip.status === 'completed')
    return { ...base, state: 'closed', message: 'Chuyến đã hoàn thành, không còn nhận soát vé.' };
  if (!opensAt || !closesAt)
    return { ...base, state: 'unavailable', message: 'Lịch chuyến không hợp lệ.' };
  if (now < Date.parse(opensAt))
    return {
      ...base,
      state: 'not_open',
      message: `Chuyến chưa mở soát vé. Giờ mở: ${dateTime(opensAt)} (giờ Việt Nam).`,
    };
  if (now > Date.parse(closesAt))
    return {
      ...base,
      state: 'closed',
      message: `Chuyến đã đóng soát vé lúc ${dateTime(closesAt)} (giờ Việt Nam).`,
    };
  return {
    ...base,
    state: 'open',
    message: `Đang mở soát vé. Đóng lúc ${dateTime(closesAt)} (giờ Việt Nam).`,
  };
}

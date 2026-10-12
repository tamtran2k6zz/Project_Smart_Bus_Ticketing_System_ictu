export interface CheckInWindow {
  state: 'not_open' | 'open' | 'closed' | 'unavailable';
  opensAt: string | null;
  closesAt: string | null;
  serverTime: string;
  message: string;
  reason: string;
}

const localTime = (value: number) => {
  const parts = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(value));
  const get = (name: string) => parts.find(p => p.type === name)?.value;
  return `${get('hour')}:${get('minute')} ${get('day')}/${get('month')}/${get('year')}`;
};

/** Same server policy for QR validation and the staff screen. Times are absolute instants. */
export function getCheckInWindow(
  trip: {
    departure_time: string | Date;
    arrival_time: string | Date;
    status: string;
  },
  now = Date.now()
): CheckInWindow {
  const departure = new Date(trip.departure_time).getTime();
  const arrival = new Date(trip.arrival_time).getTime();
  const valid = Number.isFinite(departure) && Number.isFinite(arrival) && arrival > departure;
  const opens = departure - 30 * 60_000,
    closes = arrival + 90 * 60_000;
  const base = {
    opensAt: valid ? new Date(opens).toISOString() : null,
    closesAt: valid ? new Date(closes).toISOString() : null,
    serverTime: new Date(now).toISOString(),
  };
  if (trip.status === 'COMPLETED')
    return {
      ...base,
      state: 'closed',
      reason: 'TRIP_COMPLETED',
      message: 'Chuyến đã hoàn thành, không còn nhận soát vé.',
    };
  if (trip.status === 'CANCELLED')
    return {
      ...base,
      state: 'unavailable',
      reason: 'TRIP_CANCELLED',
      message: 'Chuyến đã bị hủy, không thể soát vé.',
    };
  if (!valid || !['SCHEDULED', 'IN_TRANSIT'].includes(trip.status))
    return {
      ...base,
      state: 'unavailable',
      reason: 'INVALID_TRIP_SCHEDULE',
      message: 'Lịch hoặc trạng thái chuyến không hợp lệ. Vui lòng liên hệ điều hành.',
    };
  if (now < opens)
    return {
      ...base,
      state: 'not_open',
      reason: 'CHECKIN_NOT_OPEN',
      message: `Chuyến chưa mở soát vé. Giờ mở: ${localTime(opens)}; đóng lúc ${localTime(closes)} (giờ Việt Nam).`,
    };
  if (now > closes)
    return {
      ...base,
      state: 'closed',
      reason: 'CHECKIN_WINDOW_CLOSED',
      message: `Chuyến đã đóng soát vé lúc ${localTime(closes)} (giờ Việt Nam).`,
    };
  return {
    ...base,
    state: 'open',
    reason: 'CHECKIN_OPEN',
    message: `Đang mở soát vé. Đóng lúc ${localTime(closes)} (giờ Việt Nam).`,
  };
}

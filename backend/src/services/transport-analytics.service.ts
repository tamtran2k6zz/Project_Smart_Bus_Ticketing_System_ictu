import { query } from '../config/database';
export interface DemandTrip {
  routeId: string;
  route: string;
  date: string;
  hour: number;
  capacity: number;
  passengers: number;
  tripId: string;
  vehicle: string;
}
export function forecastDemand(trips: DemandTrip[], date: string, peakFactor = 1) {
  const weekday = new Date(date + 'T12:00:00+07:00').getUTCDay();
  const routes = [...new Set(trips.map(t => t.routeId))];
  return routes.map(id => {
    const history = trips.filter(t => t.routeId === id);
    const days = [...new Set(history.map(t => t.date))];
    const sameDays = days.filter(d => new Date(d + 'T12:00:00+07:00').getUTCDay() === weekday);
    const sampled = sameDays.length >= 2 ? sameDays : days;
    const totals = sampled.map(day =>
      history.filter(t => t.date === day).reduce((sum, t) => sum + t.passengers, 0)
    );
    const mean = totals.reduce((a, b) => a + b, 0) / (totals.length || 1);
    const variance = totals.reduce((n, t) => n + (t - mean) ** 2, 0) / (totals.length || 1);
    const capacity = Math.round(
      history.reduce((n, t) => n + t.capacity, 0) / (history.length || 1)
    );
    const demand = Math.ceil(mean * peakFactor);
    return {
      routeId: id,
      route: history[0].route,
      date,
      sampleDays: sampled.length,
      confidence: sampled.length >= 4 ? 'medium' : 'low',
      expectedPassengers: demand,
      rangeLow: Math.max(0, Math.floor((mean - Math.sqrt(variance)) * peakFactor)),
      rangeHigh: Math.ceil((mean + Math.sqrt(variance)) * peakFactor),
      recommendedTrips: Math.ceil(demand / Math.max(1, capacity * 0.8)),
      capacity,
      peakFactor,
      method: sameDays.length >= 2 ? 'same-weekday-mean' : 'daily-mean',
    };
  });
}
export async function transportAnalytics(
  from: string,
  to: string,
  routeId: string,
  forecastDate: string,
  peakFactor: number
) {
  const trips = await query<DemandTrip[]>(
    `SELECT tr.id AS "tripId",r.id AS "routeId",r.name AS route,b.plate_number AS vehicle,
    (tr.departure_time AT TIME ZONE 'Asia/Ho_Chi_Minh')::date::text AS date,
    EXTRACT(HOUR FROM tr.departure_time AT TIME ZONE 'Asia/Ho_Chi_Minh')::int AS hour,
    b.total_seats AS capacity,
    ((SELECT COALESCE(SUM(t.quantity),0) FROM tickets t JOIN payment_transactions p ON p.ticket_id=t.id WHERE t.trip_id=tr.id AND p.status='SUCCESS' AND t.status IN ('BOOKED','CHECKED_IN'))+(SELECT count(*) FROM pass_checkins pc WHERE pc.trip_id=tr.id))::int AS passengers
    FROM trips tr JOIN routes r ON r.id=tr.route_id JOIN buses b ON b.id=tr.bus_id
    WHERE tr.status<>'CANCELLED' AND tr.departure_time<NOW() AND (tr.departure_time AT TIME ZONE 'Asia/Ho_Chi_Minh')::date BETWEEN $1::date AND $2::date AND ($3='' OR r.id=$3)`,
    [from, to, routeId]
  );
  const stops = await query<any[]>(
    `SELECT s.id AS "stopId",s.name AS stop,
    EXTRACT(HOUR FROM (tr.departure_time + COALESCE(rs.estimated_time_minutes,0)*INTERVAL '1 minute') AT TIME ZONE 'Asia/Ho_Chi_Minh')::int AS hour,
    h.boarding_stop_id=s.id AS boarding, SUM(t.quantity)::int AS passengers
    FROM tickets t JOIN payment_transactions p ON p.ticket_id=t.id JOIN ui_bookings ub ON ub.ticket_id=t.id JOIN ui_holds h ON h.id=ub.hold_id
    JOIN trips tr ON tr.id=t.trip_id JOIN bus_stops s ON s.id IN (h.boarding_stop_id,h.alighting_stop_id)
    JOIN route_stops rs ON rs.route_id=tr.route_id AND rs.stop_id=s.id
    WHERE p.status='SUCCESS' AND t.status IN ('BOOKED','CHECKED_IN') AND tr.departure_time<NOW()
    AND (tr.departure_time AT TIME ZONE 'Asia/Ho_Chi_Minh')::date BETWEEN $1::date AND $2::date AND ($3='' OR tr.route_id=$3)
    GROUP BY s.id,s.name,h.boarding_stop_id=s.id,EXTRACT(HOUR FROM (tr.departure_time + COALESCE(rs.estimated_time_minutes,0)*INTERVAL '1 minute') AT TIME ZONE 'Asia/Ho_Chi_Minh')`,
    [from, to, routeId]
  );
  const buckets = new Map<string, any>();
  for (const trip of trips) {
    const key = trip.routeId + ':' + trip.hour;
    const row = buckets.get(key) || {
      routeId: trip.routeId,
      route: trip.route,
      hour: trip.hour,
      passengers: 0,
      capacity: 0,
      trips: 0,
    };
    row.passengers += trip.passengers;
    row.capacity += trip.capacity;
    row.trips++;
    buckets.set(key, row);
  }
  const density = [...buckets.values()].map(row => ({
    ...row,
    occupancy: Math.round((row.passengers / Math.max(1, row.capacity)) * 100),
    recommendation:
      row.passengers / Math.max(1, row.capacity) > 0.8
        ? 'Tăng tần suất'
        : row.passengers / Math.max(1, row.capacity) < 0.3
          ? 'Xem xét giảm tần suất'
          : 'Giữ tần suất',
  }));
  const forecasts = forecastDemand(trips, forecastDate, peakFactor);
  return {
    density,
    stops,
    forecasts,
    sampleTrips: trips.length,
    warning: !trips.length
      ? 'Chưa đủ dữ liệu lịch sử; chưa thể dự báo.'
      : 'Dự báo thống kê tham khảo; hệ số cao điểm do điều hành nhập, chưa phải mô hình đã được hiệu chỉnh.',
    method: 'Trung bình cùng thứ trong tuần, fallback trung bình ngày; mục tiêu lấp đầy 80%',
  };
}

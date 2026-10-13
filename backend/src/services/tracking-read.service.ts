import { query } from '../config/database';
import { calculateHaversineDistance } from './gps.service';

export async function readTripLocation(tripId: string) {
  const [trip] = await query<any[]>('SELECT id,delay_minutes FROM trips WHERE id=$1', [tripId]);
  if (!trip) throw Object.assign(new Error('Không tìm thấy chuyến.'), { status: 404 });
  const [position] = await query<any[]>('SELECT * FROM trip_locations WHERE trip_id=$1', [tripId]);
  if (!position)
    return {
      lat: null,
      lng: null,
      updatedAt: null,
      connected: false,
      eta: null,
      nextStop: 'Chưa có dữ liệu GPS',
      source: 'unavailable',
    };
  const lat = Number(position.latitude),
    lng = Number(position.longitude);
  const updatedAt = new Date(position.updated_at).toISOString();
  const age = Date.now() - Date.parse(updatedAt);
  const connected = age >= -5000 && age < 120000;
  if (!connected)
    return {
      lat,
      lng,
      updatedAt,
      connected,
      eta: null,
      nextStop: 'Chờ dữ liệu GPS mới',
      source: 'device',
    };
  const stops = await query<any[]>(
    `SELECT s.id,s.name,s.latitude::double precision AS lat,s.longitude::double precision AS lng
    FROM trips t JOIN route_stops rs ON rs.route_id=t.route_id JOIN bus_stops s ON s.id=rs.stop_id
    WHERE t.id=$1 AND s.latitude IS NOT NULL AND s.longitude IS NOT NULL ORDER BY rs.stop_order`,
    [tripId]
  );
  let next = stops[0],
    bestDistance = Infinity;
  // Project the measured position onto the closest route segment; never move the marker.
  for (let i = 0; i + 1 < stops.length; i++) {
    const a = stops[i],
      b = stops[i + 1],
      scale = Math.cos((lat * Math.PI) / 180);
    const dx = (b.lng - a.lng) * scale,
      dy = b.lat - a.lat;
    const ratio = Math.max(
      0,
      Math.min(1, ((lng - a.lng) * scale * dx + (lat - a.lat) * dy) / (dx * dx + dy * dy || 1))
    );
    const distance = calculateHaversineDistance(
      lat,
      lng,
      a.lat + ratio * dy,
      a.lng + ratio * (b.lng - a.lng)
    );
    if (distance < bestDistance) {
      bestDistance = distance;
      next = b;
    }
  }
  const speed = Number(position.speed);
  const eta =
    next && speed > 0.5 && Number.isFinite(speed) && bestDistance < 2000
      ? Math.ceil(calculateHaversineDistance(lat, lng, next.lat, next.lng) / speed / 60)
      : null;
  return {
    lat,
    lng,
    updatedAt,
    connected,
    eta,
    nextStop: next?.name ?? 'Chưa xác định trạm',
    source: 'device',
    delayMinutes: trip.delay_minutes,
  };
}

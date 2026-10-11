import { query } from '../config/database';
import { assertTripAccess } from './trip-access.service';
import { saveTripLocation } from './gps.service';
import { notifyApproachingPassengers } from './notification.service';

export async function updateTripLocation(
  tripId: string,
  userId: string,
  role: string,
  data: any
): Promise<void> {
  await assertTripAccess(tripId, userId, role);
  const latitude = data.latitude,
    longitude = data.longitude;
  if (
    typeof latitude !== 'number' ||
    !Number.isFinite(latitude) ||
    Math.abs(latitude) > 90 ||
    typeof longitude !== 'number' ||
    !Number.isFinite(longitude) ||
    Math.abs(longitude) > 180 ||
    (data.speed !== undefined && (!Number.isFinite(data.speed) || data.speed < 0)) ||
    (data.heading !== undefined &&
      (!Number.isFinite(data.heading) || data.heading < 0 || data.heading >= 360))
  )
    throw Object.assign(new Error('Tọa độ, tốc độ hoặc hướng không hợp lệ.'), { status: 400 });
  await query(
    `INSERT INTO trip_locations(trip_id,latitude,longitude,speed,heading)
    VALUES($1,$2,$3,$4,$5) ON CONFLICT(trip_id) DO UPDATE SET latitude=$2,longitude=$3,speed=$4,heading=$5,updated_at=NOW()`,
    [tripId, latitude, longitude, data.speed ?? null, data.heading ?? null]
  );
  await saveTripLocation(tripId, { latitude, longitude, speed: data.speed, heading: data.heading });
  await notifyApproachingPassengers(tripId, { latitude, longitude });
}

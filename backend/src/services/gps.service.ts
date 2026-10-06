import { appLogger } from '../config/logger';
import { createClient } from 'redis';
import { describeRedisTarget } from '../config/env';

const logger = appLogger.child('gps-service');

const target = describeRedisTarget();
// Standalone Redis client specifically for GPS caching if configured, otherwise fallback to memory
const gpsRedisClient = target.configured ? createClient({ url: target.url }) : null;

if (gpsRedisClient && !gpsRedisClient.isOpen) {
  void gpsRedisClient
    .connect()
    .catch(err => logger.error('gps_redis_connect_error', { error: err }));
}

// In-memory fallback cache with periodic cleanup
const memoryGpsCache = new Map<
  string,
  { latitude: number; longitude: number; speed?: number; heading?: number; updatedAt: number }
>();
const lastUpdateMap = new Map<string, number>();

// Periodic cleanup of stale memory entries every 5 minutes
const cacheCleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [tripId, val] of memoryGpsCache.entries()) {
    if (now - val.updatedAt > 300_000) {
      memoryGpsCache.delete(tripId);
    }
  }
  for (const [key, timestamp] of lastUpdateMap.entries()) {
    if (now - timestamp > 300_000) {
      lastUpdateMap.delete(key);
    }
  }
}, 300_000);
cacheCleanupInterval.unref();

/**
 * Day 13: Haversine distance formula calculation (returns distance in meters)
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Day 13: Geofencing check against upcoming route stops
 * Returns the nearest stop if within threshold (e.g. 100 meters)
 */
export function checkGeofencing(
  currentLat: number,
  currentLon: number,
  stops: Array<{ id: string; name: string; latitude: number; longitude: number; sequence: number }>,
  thresholdMeters = 100
): { stopId: string; stopName: string; distanceMeters: number } | null {
  let nearest: { stopId: string; stopName: string; distanceMeters: number } | null = null;
  for (const stop of stops) {
    if (!stop.latitude || !stop.longitude) continue;
    const distance = calculateHaversineDistance(
      currentLat,
      currentLon,
      stop.latitude,
      stop.longitude
    );
    if (distance <= thresholdMeters) {
      if (!nearest || distance < nearest.distanceMeters) {
        nearest = { stopId: stop.id, stopName: stop.name, distanceMeters: Math.round(distance) };
      }
    }
  }
  return nearest;
}

/**
 * Day 12 & 14: Save latest GPS coordinates to Redis (with TTL 120s) and memory fallback
 */
export async function saveTripLocation(
  tripId: string,
  data: { latitude: number; longitude: number; speed?: number; heading?: number }
): Promise<void> {
  const payload = { ...data, updatedAt: Date.now() };
  memoryGpsCache.set(tripId, payload);

  if (gpsRedisClient?.isReady) {
    try {
      await gpsRedisClient.set(`trip:location:${tripId}`, JSON.stringify(payload), { EX: 120 });
    } catch (error) {
      logger.error('redis_gps_save_error', { trip_id: tripId, error });
    }
  }
}

/**
 * Day 12: Retrieve latest GPS coordinates for a trip
 */
export async function getTripLocation(tripId: string): Promise<{
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  updatedAt: number;
} | null> {
  if (gpsRedisClient?.isReady) {
    try {
      const raw = await gpsRedisClient.get(`trip:location:${tripId}`);
      if (raw) return JSON.parse(raw);
    } catch (error) {
      logger.error('redis_gps_get_error', { trip_id: tripId, error });
    }
  }
  return memoryGpsCache.get(tripId) || null;
}

/**
 * Day 14: Throttling & Duplicate filtering (3 seconds interval, ignore if position changed < 3 meters)
 */
export function shouldThrottleGpsUpdate(
  driverId: string,
  lat: number,
  lon: number,
  minIntervalMs = 3000,
  minDistanceMeters = 3
): boolean {
  const now = Date.now();
  const lastKey = `driver:${driverId}`;
  const lastTime = lastUpdateMap.get(`${lastKey}:time`) || 0;
  const lastLat = lastUpdateMap.get(`${lastKey}:lat`);
  const lastLon = lastUpdateMap.get(`${lastKey}:lon`);

  if (now - lastTime < minIntervalMs) {
    return true; // Throttled due to time
  }

  if (lastLat !== undefined && lastLon !== undefined) {
    const distance = calculateHaversineDistance(lastLat, lastLon, lat, lon);
    if (distance < minDistanceMeters) {
      return true; // Throttled due to insignificant movement (e.g. traffic light stop)
    }
  }

  lastUpdateMap.set(`${lastKey}:time`, now);
  lastUpdateMap.set(`${lastKey}:lat`, lat);
  lastUpdateMap.set(`${lastKey}:lon`, lon);
  return false;
}

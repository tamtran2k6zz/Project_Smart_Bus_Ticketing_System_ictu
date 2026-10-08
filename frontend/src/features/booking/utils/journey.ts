import type { Route, Stop } from '@/features/operations/types';
import type { Trip } from '../types';
/** Ordered stop matching also supports optional one-sided searches. */
export function journeyStops(route: Route, stops: Stop[], from = '', to = '') {
  const names = route.stopIds.map(id => stops.find(s => s.id === id)?.name);
  const start = from ? names.indexOf(from) : 0;
  const end = to ? names.indexOf(to) : names.length - 1;
  return start >= 0 && end > start
    ? { boardingStopId: route.stopIds[start], alightingStopId: route.stopIds[end] }
    : null;
}
export function upcomingTrips(trips: Trip[], now = Date.now()) {
  return trips
    .filter(t => Date.parse(t.departure) > now && t.status !== 'completed')
    .sort((a, b) => Date.parse(a.departure) - Date.parse(b.departure));
}

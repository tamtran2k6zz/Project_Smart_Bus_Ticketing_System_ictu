import type { Route, Stop } from '@/features/operations/types';
import type { Trip } from '../types';
export function boardingDeparture(trip: Trip, route?: Route, stopId?: string) {
  const index = route?.stopIds.indexOf(stopId ?? route.stopIds[0]) ?? -1;
  const minutes = route?.stopMinutes?.[index] ?? 0;
  return new Date(Date.parse(trip.departure) + minutes * 60000).toISOString();
}
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

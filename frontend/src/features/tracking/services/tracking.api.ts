import { service } from '@/services/adapter';
import { getTrip } from '@/features/booking/services/booking.api';
import type { LocationUpdate } from '../types';
import { notify } from '@/services/mocks/database';

interface LocationPayload {
  lat?: number | string;
  lng?: number | string;
  latitude?: number | string;
  longitude?: number | string;
  updatedAt?: number | string;
  connected?: boolean;
  eta?: number | string | null;
  nextStop?: string;
}

type LocationResponse = LocationPayload & { data?: LocationPayload };

export const trackingApi = {
  location: async (tripId: string): Promise<LocationUpdate> => {
    const res = await service<LocationResponse>('/trips/' + tripId + '/location', db => {
      try {
        const t = getTrip(db, tripId);
        const r = db.routes.find(r => r.id === t.routeId);
        if (!r || !r.stopIds || r.stopIds.length < 2) {
          return {
            lat: 21.58245,
            lng: 105.83615,
            updatedAt: new Date().toISOString(),
            connected: true,
            eta: 5,
            nextStop: 'Bến xe trung tâm Thái Nguyên',
          };
        }
        const segmentTime = Date.now() % ((r.stopIds.length - 1) * 120000);
        const segment = Math.floor(segmentTime / 120000);
        const start = db.stops.find(s => s.id === r.stopIds[segment]) || {
          lat: 21.58245,
          lng: 105.83615,
          name: 'Điểm xuất phát',
          id: 'start',
        };
        const end = db.stops.find(s => s.id === r.stopIds[segment + 1]) || {
          lat: 21.588,
          lng: 105.834,
          name: 'Trạm tiếp theo',
          id: 'end',
        };
        const progress = (segmentTime % 120000) / 120000;
        const eta = Math.max(1, Math.round((1 - progress) * 12));
        db.subscriptions
          ?.filter(s => s.tripId === tripId)
          .forEach(subscription => {
            if (eta <= 2 && subscription.lastNotifiedStop !== end.id) {
              notify(
                db,
                subscription.userId,
                'Xe sắp đến trạm (demo)',
                end.name + ' · ETA ' + eta + ' phút.',
                '/tracking/' + tripId
              );
              subscription.lastNotifiedStop = end.id;
            }
          });
        return {
          lat: (start.lat ?? 21.58245) + ((end.lat ?? 21.588) - (start.lat ?? 21.58245)) * progress,
          lng:
            (start.lng ?? 105.83615) + ((end.lng ?? 105.834) - (start.lng ?? 105.83615)) * progress,
          updatedAt: new Date().toISOString(),
          connected: true,
          eta,
          nextStop: end.name,
        };
      } catch {
        return {
          lat: 21.58245,
          lng: 105.83615,
          updatedAt: new Date().toISOString(),
          connected: true,
          eta: 5,
          nextStop: 'Bến xe Thái Nguyên',
        };
      }
    });

    const raw = res && typeof res === 'object' && 'data' in res && res.data ? res.data : res;
    let updateTime: string | null = null;
    if (raw?.updatedAt != null) {
      const date =
        typeof raw.updatedAt === 'number' ? new Date(raw.updatedAt) : new Date(raw.updatedAt);
      if (Number.isFinite(date.getTime())) updateTime = date.toISOString();
    }
    const rawLat = raw?.lat ?? raw?.latitude,
      rawLng = raw?.lng ?? raw?.longitude;
    const lat =
      rawLat != null && Number.isFinite(Number(rawLat)) && Math.abs(Number(rawLat)) <= 90
        ? Number(rawLat)
        : null;
    const lng =
      rawLng != null && Number.isFinite(Number(rawLng)) && Math.abs(Number(rawLng)) <= 180
        ? Number(rawLng)
        : null;
    return {
      lat,
      lng,
      updatedAt: updateTime,
      connected: raw?.connected === true && lat !== null && lng !== null && updateTime !== null,
      eta: raw?.eta != null && Number.isFinite(Number(raw.eta)) ? Number(raw.eta) : null,
      nextStop: String(raw?.nextStop ?? 'Chưa xác định trạm'),
    };
  },
};

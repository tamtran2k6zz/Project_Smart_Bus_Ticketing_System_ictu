import { service } from '@/services/adapter';
import { getTrip } from '@/features/booking/services/booking.api';
import type { LocationUpdate } from '../types';
import { notify } from '@/services/mocks/database';
export const trackingApi = {
  location: (tripId: string) =>
    service<LocationUpdate>('/trips/' + tripId + '/location', db => {
      const t = getTrip(db, tripId);
      const r = db.routes.find(r => r.id === t.routeId)!;
      const segmentTime = Date.now() % ((r.stopIds.length - 1) * 120000);
      const segment = Math.floor(segmentTime / 120000);
      const start = db.stops.find(s => s.id === r.stopIds[segment])!;
      const end = db.stops.find(s => s.id === r.stopIds[segment + 1])!;
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
        lat: start.lat + (end.lat - start.lat) * progress,
        lng: start.lng + (end.lng - start.lng) * progress,
        updatedAt: new Date().toISOString(),
        connected: true,
        eta,
        nextStop: end.name,
      };
    }),
};

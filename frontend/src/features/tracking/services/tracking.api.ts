import { service } from '@/services/adapter';
import { getTrip } from '@/features/booking/services/booking.api';
import type { LocationUpdate, FleetBusStatus, BusOperatingStatus } from '../types';
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

  fleet: () =>
    service<FleetBusStatus[]>('/operations/fleet', db => {
      const now = Date.now();
      const statuses: FleetBusStatus[] = [];

      db.vehicles.forEach((vehicle, index) => {
        const assignment = db.assignments.find(a => a.vehicleId === vehicle.id);
        const trip = assignment ? db.trips.find(t => t.id === assignment.tripId) : undefined;
        const route = trip ? db.routes.find(r => r.id === trip.routeId) : db.routes[index % db.routes.length];
        const staff = assignment ? db.staff.find(s => s.id === assignment.staffId) : db.staff[index % db.staff.length];

        // Determine stops for vehicle route
        const stopIds = route ? route.stopIds : ['s1', 's2'];
        const stops = stopIds
          .map(id => db.stops.find(s => s.id === id))
          .filter((s): s is NonNullable<typeof s> => !!s);

        // Simulation parameters offset per vehicle
        const periodMs = 150000; // 2.5 minutes per loop
        const offsetMs = (index * 38000) % periodMs;
        const elapsed = (now + offsetMs) % periodMs;
        const ratio = elapsed / periodMs;

        // Path interpolation between stops
        let currentLat = stops[0]?.lat || 21.588;
        let currentLng = stops[0]?.lng || 105.834;
        let heading = 90;
        let nextStopName = stops[1]?.name || 'Đại học ICTU';
        let etaMinutes = 4;

        if (stops.length >= 2) {
          const segCount = stops.length - 1;
          const totalProgress = ratio * segCount;
          const segIdx = Math.min(Math.floor(totalProgress), segCount - 1);
          const segRatio = totalProgress - segIdx;
          const sA = stops[segIdx];
          const sB = stops[segIdx + 1];

          currentLat = sA.lat + (sB.lat - sA.lat) * segRatio;
          currentLng = sA.lng + (sB.lng - sA.lng) * segRatio;

          // Heading calculation
          const dy = sB.lat - sA.lat;
          const dx = sB.lng - sA.lng;
          heading = Math.round((Math.atan2(dx, dy) * 180) / Math.PI);
          if (heading < 0) heading += 360;

          nextStopName = sB.name;
          etaMinutes = Math.max(1, Math.round((1 - segRatio) * 10));
        }

        // Determine operating status
        let status: BusOperatingStatus = 'running';
        let speed = 32 + (index % 4) * 4;

        if (index === 4) {
          status = 'stopped';
          speed = 0;
          etaMinutes = 0;
        } else if (index === 5) {
          status = 'incident';
          speed = 10;
        }

        const incident = db.incidents.find(i => !i.resolved && (trip ? i.tripId === trip.id : false));
        if (incident) {
          status = 'incident';
        }

        // Passenger count & occupancy
        const passengerCount = Math.min(
          vehicle.capacity,
          Math.max(8, Math.round(vehicle.capacity * (0.45 + (index % 5) * 0.12)))
        );
        const occupancyPercent = Math.round((passengerCount / vehicle.capacity) * 100);

        statuses.push({
          vehicleId: vehicle.id,
          plate: vehicle.plate,
          name: vehicle.name,
          capacity: vehicle.capacity,
          currentTripId: trip?.id || 'trip-' + vehicle.id,
          routeId: route?.id || 'r1',
          routeCode: route?.code || '01',
          routeName: route?.name || 'Trung tâm – Đại học ICTU',
          driverId: staff?.id || 'st1',
          driverName: staff?.name || 'Trần Văn Hùng',
          driverPhone: staff?.phone || '0901234561',
          status,
          speed,
          lat: currentLat,
          lng: currentLng,
          heading,
          nextStop: nextStopName,
          etaMinutes,
          passengerCount,
          occupancyPercent,
          tempCelsius: 24 + (index % 3),
          hasAC: true,
          fuelOrBattery: 85 - index * 6,
          lastPingAt: new Date(now - (index % 3) * 2000).toISOString(),
          connected: true,
          incidentAlert: incident?.message || (status === 'incident' ? 'Ùn tắc cục bộ tại ngã tư Phan Đình Phùng' : undefined),
        });
      });

      return statuses;
    }),
};

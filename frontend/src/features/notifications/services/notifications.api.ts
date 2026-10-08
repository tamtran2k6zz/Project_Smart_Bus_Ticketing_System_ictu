import { service } from '@/services/adapter';
import { requireUser, notify } from '@/services/mocks/database';
import type { Notification } from '../types';
import { getTrip } from '@/features/booking/services/booking.api';
export const notificationsApi = {
  list: (userId: string) =>
    service<Notification[]>('/notifications', db => {
      requireUser(db, userId);
      return db.notifications.filter(n => n.userId === userId);
    }),
  read: (userId: string, id?: string) =>
    service(
      '/notifications/read',
      db => {
        requireUser(db, userId);
        db.notifications
          .filter(n => n.userId === userId && (!id || n.id === id))
          .forEach(n => (n.read = true));
        return true;
      },
      'POST',
      { id }
    ),
  subscribe: (userId: string, tripId: string) =>
    service(
      '/notifications/subscriptions',
      db => {
        requireUser(db, userId);
        getTrip(db, tripId);
        db.subscriptions ||= [];
        if (db.subscriptions.some(s => s.userId === userId && s.tripId === tripId)) return true;
        db.subscriptions.push({ userId, tripId });
        notify(
          db,
          userId,
          'Đã bật thông báo trạm (demo)',
          'Theo dõi thông báo trạm cho chuyến ' + tripId + '.',
          '/tracking/' + tripId
        );
        return true;
      },
      'POST',
      { tripId }
    ),
};

import { query } from '../config/database';
import { createNotification } from './notification.service';
export async function notifyTripChange(tripId: string, title: string, body: string) {
  const people = await query<any[]>(
    `SELECT user_id FROM tickets WHERE trip_id=$1 AND status IN ('BOOKED','CHECKED_IN')
    UNION SELECT user_id FROM trip_subscriptions WHERE trip_id=$1`,
    [tripId]
  );
  for (const person of people)
    if (person.user_id)
      await createNotification(person.user_id, {
        type: 'TRIP_UPDATE',
        title,
        body,
        data: { tripId },
      });
}

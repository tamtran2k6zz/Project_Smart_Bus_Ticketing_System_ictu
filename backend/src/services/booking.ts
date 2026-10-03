import { randomUUID } from 'crypto';
import { PoolClient } from 'pg';
import { transaction } from '../config/database';
import { acquireSeatLock, releaseSeatLock } from '../config/redis';

export class BookingError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

// The trip row serializes initialization, locks, and sales for the same trip.
export async function prepareSeats(client: PoolClient, tripId: string) {
  const {
    rows: [trip],
  } = await client.query(
    `SELECT t.*, b.plate_number, b.total_seats AS capacity, b.bus_type
     FROM trips t JOIN buses b ON b.id = t.bus_id WHERE t.id = $1 FOR UPDATE OF t`,
    [tripId]
  );
  if (!trip) throw new BookingError(404, 'Không tìm thấy chuyến xe hoặc xe buýt.');
  await client.query(
    `INSERT INTO seats (id,bus_id,seat_number,seat_type,row_position,is_priority)
     SELECT gen_random_uuid()::text, $1,
       CASE WHEN n <= ceil($2::numeric/2) THEN 'A' ELSE 'B' END ||
       lpad((CASE WHEN n <= ceil($2::numeric/2) THEN n ELSE n-ceil($2::numeric/2)::int END)::text,2,'0'),
       'STANDARD', CASE WHEN n % 2 = 1 THEN 'WINDOW' ELSE 'AISLE' END, FALSE
     FROM generate_series(1,$2::int) n ON CONFLICT (bus_id,seat_number) DO NOTHING`,
    [trip.bus_id, trip.capacity]
  );
  await client.query(
    `INSERT INTO trip_seats (trip_id,seat_id,seat_number,status,ticket_id)
     SELECT $1,s.id,s.seat_number,COALESCE(t.status,'AVAILABLE'),t.id
     FROM seats s LEFT JOIN tickets t ON t.trip_id=$1 AND t.seat_number=s.seat_number
       AND t.status IN ('BOOKED','CHECKED_IN')
     WHERE s.bus_id=$2 ON CONFLICT (trip_id,seat_number) DO NOTHING`,
    [tripId, trip.bus_id]
  );
  await client.query(
    `UPDATE trip_seats SET status='AVAILABLE',locked_at=NULL,locked_by_user_id=NULL,
     lock_expires_at=NULL,redis_lock_id=NULL
     WHERE trip_id=$1 AND status='LOCKED' AND lock_expires_at <= NOW()`,
    [tripId]
  );
  return trip;
}

export async function bookSeat(tripId: string, seatNumber: string, userId: string) {
  return transaction(async client => {
    const trip = await prepareSeats(client, tripId);
    if (trip.status !== 'SCHEDULED')
      throw new BookingError(409, 'Chuyến xe không còn nhận đặt vé.');
    const {
      rows: [seat],
    } = await client.query(
      'SELECT * FROM trip_seats WHERE trip_id=$1 AND seat_number=$2 FOR UPDATE',
      [tripId, seatNumber]
    );
    if (!seat) throw new BookingError(404, 'Ghế không tồn tại.');
    if (
      ['BOOKED', 'CHECKED_IN'].includes(seat.status) ||
      (seat.status === 'LOCKED' && seat.locked_by_user_id !== userId)
    ) {
      throw new BookingError(409, 'Ghế đã được đặt hoặc đang có người giữ chỗ.');
    }
    const ticketId = randomUUID();
    const ticketCode = 'TKT-' + randomUUID();
    const {
      rows: [ticket],
    } = await client.query(
      `INSERT INTO tickets(id,ticket_code,trip_id,seat_number,user_id,fare_amount,status)
       VALUES ($1,$2,$3,$4,$5,$6,'BOOKED') RETURNING *`,
      [ticketId, ticketCode, tripId, seatNumber, userId, trip.base_price]
    );
    await client.query(
      `UPDATE trip_seats SET status='BOOKED',ticket_id=$1,locked_at=NULL,lock_expires_at=NULL,
       locked_by_user_id=NULL,redis_lock_id=NULL WHERE id=$2`,
      [ticketId, seat.id]
    );
    await client.query('UPDATE trips SET booked_seats=booked_seats+1 WHERE id=$1', [tripId]);
    return ticket;
  });
}

export async function reserveSeatForPayment(
  tripId: string,
  seatNumber: string,
  userId: string,
  paymentMethod: 'VNPAY' | 'MOMO',
  redisLockId: string
) {
  return transaction(async client => {
    const trip = await prepareSeats(client, tripId);
    if (trip.status !== 'SCHEDULED') {
      throw new BookingError(409, 'Chuyến xe không còn nhận đặt vé.');
    }
    const {
      rows: [seat],
    } = await client.query(
      'SELECT * FROM trip_seats WHERE trip_id=$1 AND seat_number=$2 FOR UPDATE',
      [tripId, seatNumber]
    );
    if (!seat) throw new BookingError(404, 'Ghế không tồn tại.');
    if (
      ['BOOKED', 'CHECKED_IN'].includes(seat.status) ||
      (seat.status === 'LOCKED' && seat.locked_by_user_id !== userId)
    ) {
      throw new BookingError(409, 'Ghế đã được đặt hoặc đang có người giữ chỗ.');
    }

    const ticketId = randomUUID();
    const ticketCode = 'TKT-' + randomUUID();
    const {
      rows: [ticket],
    } = await client.query(
      `INSERT INTO tickets
        (id,ticket_code,trip_id,seat_number,user_id,fare_amount,status,reservation_expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,'RESERVED',NOW()+INTERVAL '10 minutes')
       RETURNING *`,
      [ticketId, ticketCode, tripId, seatNumber, userId, trip.base_price]
    );
    await client.query(
      `UPDATE trip_seats SET status='LOCKED',ticket_id=$1,locked_at=NOW(),
       lock_expires_at=NOW()+INTERVAL '10 minutes',locked_by_user_id=$2,redis_lock_id=$3
       WHERE id=$4`,
      [ticketId, userId, redisLockId, seat.id]
    );
    await client.query(
      `INSERT INTO payment_transactions
        (ticket_id,order_id,payment_method,amount,status,redis_lock_id)
       VALUES ($1,$1,$2,$3,'PENDING',$4)`,
      [ticketId, paymentMethod, trip.base_price, redisLockId]
    );
    return ticket;
  });
}

export async function holdSeat(tripId: string, seatNumber: string, userId: string) {
  const redisLockId = await acquireSeatLock(tripId, seatNumber, userId);
  if (!redisLockId) throw new BookingError(409, 'Ghế đang được người khác giữ.');
  try {
    return await transaction(async client => {
      const trip = await prepareSeats(client, tripId);
      if (trip.status !== 'SCHEDULED')
        throw new BookingError(409, 'Chuyến xe không còn nhận đặt vé.');
      const {
        rows: [seat],
      } = await client.query(
        `UPDATE trip_seats SET status='LOCKED',locked_at=NOW(),
         lock_expires_at=NOW()+INTERVAL '10 minutes',locked_by_user_id=$3,redis_lock_id=$4
         WHERE trip_id=$1 AND seat_number=$2 AND status='AVAILABLE' RETURNING *`,
        [tripId, seatNumber, userId, redisLockId]
      );
      if (!seat) throw new BookingError(409, 'Ghế không tồn tại hoặc không còn trống.');
      return seat;
    });
  } catch (error) {
    await releaseSeatLock(tripId, seatNumber, redisLockId);
    throw error;
  }
}

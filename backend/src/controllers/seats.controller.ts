import { Request, Response } from 'express';
import { query, transaction } from '../config/database';
import { releaseSeatLock } from '../config/redis';
import { AuthenticatedRequest } from '../middlewares/auth';
import { prepareSeats, holdSeat } from '../services/booking';

export const getSeatsByTrip = async (req: Request, res: Response): Promise<void> => {
  try {
    const tripId = String(req.params.tripId || req.query.tripId || '');
    if (!tripId) {
      res.status(400).json({ success: false, message: 'tripId is required' });
      return;
    }
    const data = await transaction(async client => {
      const trip = await prepareSeats(client, tripId);
      const { rows } = await client.query(
        'SELECT ts.*,s.seat_type,s.row_position,s.deck,s.is_priority FROM trip_seats ts JOIN seats s ON s.id=ts.seat_id WHERE ts.trip_id=$1 ORDER BY ts.seat_number',
        [tripId]
      );
      const seats = rows.map(s => ({
        id: s.seat_id,
        tripSeatId: s.id,
        seatNumber: s.seat_number,
        seatType: s.seat_type,
        rowPosition: s.row_position,
        deck: s.deck,
        isPriority: s.is_priority,
        status: s.status,
        isAvailable: s.status === 'AVAILABLE',
        lockExpiresAt: s.lock_expires_at,
        ticketId: s.ticket_id,
      }));
      return {
        tripId: trip.id,
        busPlate: trip.plate_number,
        busType: trip.bus_type,
        totalSeats: seats.length,
        availableCount: seats.filter(s => s.status === 'AVAILABLE').length,
        bookedCount: seats.filter(s => ['BOOKED', 'CHECKED_IN'].includes(s.status)).length,
        lockedCount: seats.filter(s => s.status === 'LOCKED').length,
        seats,
      };
    });
    res.json({ statusCode: 200, success: true, data, ...data });
  } catch (err: any) {
    res
      .status(err.status || 500)
      .json({ success: false, message: err.status ? err.message : 'Không thể tải sơ đồ ghế.' });
  }
};
export const lockSeat = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const tripId = String(req.params.tripId || req.body.tripId || '');
    if (!tripId || !req.body.seatNumber) {
      res.status(400).json({ success: false, message: 'tripId and seatNumber are required' });
      return;
    }
    const data = await holdSeat(tripId, req.body.seatNumber, req.user!.id);
    res.json({ statusCode: 200, success: true, data });
  } catch (err: any) {
    res
      .status(err.status || 500)
      .json({ success: false, message: err.status ? err.message : 'Không thể giữ chỗ.' });
  }
};
export const unlockSeat = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const rows = await query<any[]>(
      "UPDATE trip_seats SET status='AVAILABLE',locked_at=NULL,lock_expires_at=NULL,locked_by_user_id=NULL,redis_lock_id=NULL WHERE trip_id=$1 AND seat_number=$2 AND status='LOCKED' AND locked_by_user_id=$3 RETURNING id,redis_lock_id",
      [String(req.params.tripId || req.body.tripId || ''), req.body.seatNumber, req.user!.id]
    );
    if (rows.length)
      await releaseSeatLock(
        String(req.params.tripId || req.body.tripId || ''),
        req.body.seatNumber,
        rows[0].redis_lock_id || undefined
      );
    res.status(rows.length ? 200 : 409).json({ success: !!rows.length });
  } catch (error) {
    console.error('[Seats] Could not unlock seat:', error);
    res.status(500).json({ success: false, message: 'Không thể mở khóa ghế.' });
  }
};
export const getSeatsByBus = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await query<any[]>(
      'SELECT s.*,b.plate_number,b.bus_type FROM seats s JOIN buses b ON b.id=s.bus_id WHERE s.bus_id=$1 ORDER BY s.seat_number',
      [req.params.busId]
    );
    res.json({ success: true, total: data.length, data });
  } catch {
    res.status(500).json({ success: false });
  }
};
export const getAllSeats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const data = await query<any[]>(
      'SELECT s.*,b.plate_number,b.bus_type FROM seats s JOIN buses b ON b.id=s.bus_id ORDER BY s.bus_id,s.seat_number'
    );
    res.json({ success: true, total: data.length, data });
  } catch {
    res.status(500).json({ success: false });
  }
};

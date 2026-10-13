import { query } from '../config/database';

export async function assertTripAccess(
  tripId: string,
  userId: string,
  role: string
): Promise<void> {
  const [trip] = await query<any[]>(
    'SELECT t.driver_id,t.conductor_id,u.role,u.status FROM trips t JOIN users u ON u.id=$2 WHERE t.id=$1',
    [tripId, userId]
  );
  if (!trip) throw Object.assign(new Error('Không tìm thấy chuyến.'), { status: 404 });
  if (
    trip.status !== 'ACTIVE' ||
    trip.role !== role ||
    !['ADMIN', 'MANAGER', 'DRIVER'].includes(role) ||
    (role === 'DRIVER' && trip.driver_id !== userId && trip.conductor_id !== userId)
  )
    throw Object.assign(new Error('Chuyến chưa được phân công cho bạn.'), { status: 403 });
}

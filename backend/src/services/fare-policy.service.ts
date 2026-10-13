import { query } from '../config/database';
export async function userFarePolicy(userId: string) {
  const [policy] = await query<any[]>(
    `SELECT p.* FROM users u JOIN fare_policies p ON p.category=CASE WHEN u.discount_status='APPROVED' THEN u.discount_type ELSE 'NONE' END WHERE u.id=$1`,
    [userId]
  );
  if (!policy)
    throw Object.assign(new Error('Chưa cấu hình chính sách giá cho khách hàng.'), { status: 503 });
  return {
    ticketDiscount: Number(policy.ticket_discount_percent),
    monthlyPrice: Number(policy.monthly_price),
    category: policy.category,
  };
}

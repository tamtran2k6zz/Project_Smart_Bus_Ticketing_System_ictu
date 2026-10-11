import { money } from '@/utils/format';
import type { Booking } from '../types';
type PricedBooking = Pick<Booking, 'total' | 'discount' | 'voucher'>;
// Booking lưu total đã trừ ưu đãi; tạm tính = total + discount.
export function bookingPrice(b: PricedBooking) {
  const discount = b.discount > 0 ? b.discount : 0;
  return {
    subtotal: b.total + discount,
    discount,
    discountLabel: 'Ưu đãi' + (discount && b.voucher ? ' ' + b.voucher : ''),
    total: b.total,
  };
}
export function receiptPriceLines(b: PricedBooking) {
  const p = bookingPrice(b);
  return [
    'Tạm tính: ' + money(p.subtotal),
    ...(p.discount ? [p.discountLabel + ': -' + money(p.discount)] : []),
    'Tổng thanh toán: ' + money(p.total),
  ];
}

import { money } from '@/utils/format';
import { bookingPrice } from '../utils/price';
import type { Booking } from '../types';
export function PriceBreakdown({
  booking,
  totalLabel = 'Tổng cộng',
}: {
  booking: Pick<Booking, 'total' | 'discount' | 'voucher'>;
  totalLabel?: string;
}) {
  const p = bookingPrice(booking);
  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="between">
        <span className="muted">Tạm tính</span>
        <span>{money(p.subtotal)}</span>
      </div>
      {p.discount > 0 && (
        <div className="between">
          <span className="muted">{p.discountLabel}</span>
          <strong>− {money(p.discount)}</strong>
        </div>
      )}
      <div className="between">
        <strong>{totalLabel}</strong>
        <span className="price">{money(p.total)}</span>
      </div>
    </div>
  );
}

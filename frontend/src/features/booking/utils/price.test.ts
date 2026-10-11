import { describe, expect, it } from 'vitest';
import { bookingPrice, receiptPriceLines } from './price';
describe('booking price', () => {
  it('derives subtotal and discount from a voucher booking', () => {
    expect(bookingPrice({ total: 27000, discount: 3000, voucher: 'SMART10' })).toEqual({
      subtotal: 30000,
      discount: 3000,
      discountLabel: 'Ưu đãi SMART10',
      total: 27000,
    });
  });
  it('omits the discount line when no voucher was applied', () => {
    const lines = receiptPriceLines({ total: 15000, discount: 0 });
    expect(lines).toHaveLength(2);
    expect(lines.join('\n')).not.toContain('Ưu đãi');
  });
  it('prints voucher deduction on the receipt', () => {
    const lines = receiptPriceLines({ total: 13500, discount: 1500, voucher: 'SMART10' });
    expect(lines).toHaveLength(3);
    expect(lines[1]).toMatch(/^Ưu đãi SMART10: -1\.500/);
    expect(lines[2]).toMatch(/^Tổng thanh toán: 13\.500/);
  });
});

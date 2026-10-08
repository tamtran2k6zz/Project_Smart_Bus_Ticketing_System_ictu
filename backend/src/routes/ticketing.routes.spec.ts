import { isValidOrderId } from './ticketing.routes';

describe('ticketing order id validation', () => {
  it('accepts the UUID returned as payment.orderId when booking', () => {
    expect(isValidOrderId('508d68c2-eb12-4a66-be98-3ac7e217622e')).toBe(true);
    expect(isValidOrderId('508D68C2-EB12-4A66-BE98-3AC7E217622E')).toBe(true);
  });

  it('rejects the ORD-YYYYMMDD-NNN format QA used', () => {
    expect(isValidOrderId('ORD-20261002-001')).toBe(false);
    expect(isValidOrderId('TKT-508d68c2-eb12-4a66-be98-3ac7e217622e')).toBe(false);
  });

  it('rejects empty, truncated and non-string values', () => {
    expect(isValidOrderId('')).toBe(false);
    expect(isValidOrderId('   ')).toBe(false);
    expect(isValidOrderId(undefined)).toBe(false);
    expect(isValidOrderId(null)).toBe(false);
    expect(isValidOrderId(12345)).toBe(false);
    expect(isValidOrderId('508d68c2-eb12-4a66-be98')).toBe(false);
  });
});

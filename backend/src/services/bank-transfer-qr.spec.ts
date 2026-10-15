import { bankQrPayload, crc16 } from './bank-transfer-qr';

function fields(value: string): Record<string, string> {
  const result: Record<string, string> = {};
  while (value.length) {
    const length = Number(value.slice(2, 4));
    result[value.slice(0, 2)] = value.slice(4, 4 + length);
    value = value.slice(4 + length);
  }
  return result;
}
it('matches the checksum decoded from the supplied Techcombank QR', () => {
  const original =
    '00020101021138580010A000000727012800069704070114190752078740110208QRIBFTTA53037045802VN8300840063048FB6';
  expect(crc16(original.slice(0, -4))).toBe('8FB6');
});
it('encodes the beneficiary, VND amount and order reference in the QR itself', () => {
  const qr = bankQrPayload('970407', '19075207874011', 49000, 'SB0123456789ABCDEF012345');
  const root = fields(qr),
    merchant = fields(root['38']),
    recipient = fields(merchant['01']);
  expect(root['01']).toBe('12');
  expect(merchant['00']).toBe('A000000727');
  expect(merchant['02']).toBe('QRIBFTTA');
  expect(recipient).toEqual({ '00': '970407', '01': '19075207874011' });
  expect(root['53']).toBe('704');
  expect(root['54']).toBe('49000');
  expect(fields(root['62'])['08']).toBe('SB0123456789ABCDEF012345');
  expect(root['63']).toBe(crc16(qr.slice(0, -4)));
});
it.each([0, -1, 1.5, Number.NaN])('rejects invalid amount %s', amount => {
  expect(() => bankQrPayload('970407', '19075207874011', amount, 'SB123456')).toThrow();
});
it('rejects malformed recipient and references beyond the QR field limit', () => {
  expect(() => bankQrPayload('TCB', '19075207874011', 10000, 'SB123456')).toThrow();
  expect(() => bankQrPayload('970407', 'not-an-account', 10000, 'SB123456')).toThrow();
  expect(() => bankQrPayload('970407', '19075207874011', 10000, 'A'.repeat(26))).toThrow();
});

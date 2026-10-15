import QRCode from 'qrcode';

// Beneficiary decoded offline from the account owner's supplied Techcombank QR.
export const techcombankBeneficiary = {
  bankBin: '970407',
  bankName: 'Techcombank',
  accountNumber: '19075207874011',
  accountHolder: 'TRAN DANG CONG TAM',
};
export function crc16(value: string) {
  let crc = 0xffff;
  for (const byte of Buffer.from(value, 'utf8')) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) crc = (crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}
const field = (tag: string, value: string) =>
  tag + String(Buffer.byteLength(value, 'utf8')).padStart(2, '0') + value;
export function bankQrPayload(bankBin: string, account: string, amount: number, reference: string) {
  if (
    !/^\d{6}$/.test(bankBin) ||
    !/^\d{6,34}$/.test(account) ||
    !Number.isSafeInteger(amount) ||
    amount <= 0 ||
    !/^[A-Z0-9]{6,25}$/.test(reference)
  )
    throw new Error('Thông tin QR chuyển khoản không hợp lệ.');
  const beneficiary = field('00', bankBin) + field('01', account);
  const merchant = field('00', 'A000000727') + field('01', beneficiary) + field('02', 'QRIBFTTA');
  const data =
    field('00', '01') +
    field('01', '12') +
    field('38', merchant) +
    field('53', '704') +
    field('54', String(amount)) +
    field('58', 'VN') +
    field('62', field('08', reference)) +
    '6304';
  return data + crc16(data);
}
export async function bankTransferDto(row: any, amount: number, expiresAt?: string | Date) {
  const payload = bankQrPayload(row.bank_bin, row.account_number, amount, row.reference);
  return {
    reference: row.reference,
    bankName: row.bank_name,
    bankBin: row.bank_bin,
    accountNumber: row.account_number,
    accountHolder: row.account_holder,
    amount,
    status: row.status,
    submittedAt: row.submitted_at,
    expiresAt,
    reviewNote: row.review_note,
    qrImage: await QRCode.toDataURL(payload, { errorCorrectionLevel: 'M', margin: 4, width: 320 }),
  };
}

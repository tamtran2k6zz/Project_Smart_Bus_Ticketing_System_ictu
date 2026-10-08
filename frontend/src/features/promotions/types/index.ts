export interface Voucher {
  id: string;
  code: string;
  percent: number;
  expiresAt: string;
  active: boolean;
}

export interface Voucher {
  id: string;
  code: string;
  percent: number;
  expiresAt: string;
  active: boolean;
  description?: string;
  discountPercent?: number;
}

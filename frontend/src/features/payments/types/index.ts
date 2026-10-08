export type Gateway = 'MoMo' | 'VNPay' | 'ZaloPay' | 'Card';
export interface Payment {
  id: string;
  bookingId: string;
  gateway: Gateway;
  status: 'pending' | 'paid' | 'failed' | 'canceled';
  amount: number;
  createdAt: string;
  redirectUrl?: string;
}

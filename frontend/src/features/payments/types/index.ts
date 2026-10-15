export type Gateway = 'MoMo' | 'VNPay' | 'ZaloPay' | 'Card' | 'BankTransfer';
export interface BankTransfer {
  reference: string;
  bankName: string;
  bankBin: string;
  accountNumber: string;
  accountHolder: string;
  amount: number;
  status: 'PENDING' | 'SUBMITTED' | 'CONFIRMED' | 'REFUNDED' | 'REJECTED';
  submittedAt?: string;
  expiresAt?: string;
  reviewNote?: string;
  qrImage: string;
}
export interface Payment {
  id: string;
  bookingId: string;
  gateway: Gateway;
  status: 'pending' | 'paid' | 'failed' | 'canceled';
  amount: number;
  createdAt: string;
  redirectUrl?: string;
  bankTransfer?: BankTransfer;
}

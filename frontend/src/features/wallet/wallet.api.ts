import { request } from '@/services/http';
export interface Withdrawal {
  id: string;
  user_id: string;
  amount: number;
  bank_name: string;
  bank_account_number: string;
  account_holder_name: string;
  status: 'PENDING' | 'PAID' | 'REJECTED';
  created_at: string;
  bank_reference?: string;
  review_note?: string;
  customer_name?: string;
}
export interface WalletOverview {
  reservedBalance: number;
  wallet: { balance: number; status: string };
  transactions: {
    id: string;
    type: string;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    description: string;
    createdAt: string;
  }[];
  withdrawals: Withdrawal[];
  topups: {
    id: string;
    amount: number;
    method: string;
    status: string;
    payment_url?: string;
    created_at: string;
  }[];
  subscriptions: {
    route_id: string;
    route_name: string;
    enabled: boolean;
    max_amount: number;
    next_attempt_at: string;
    expires_at?: string;
    last_result?: string;
  }[];
}
export const walletApi = {
  overview: () => request<WalletOverview>('/wallet'),
  topup: (data: { amount: number; method: string; requestKey: string }) =>
    request<{ redirectUrl?: string; status: string }>('/wallet/topup', 'POST', data),
  withdraw: (data: {
    amount: number;
    bankName: string;
    bankAccountNumber: string;
    accountHolderName: string;
    requestKey: string;
  }) => request<Withdrawal>('/wallet/withdrawals', 'POST', data),
  buyPass: (routeId: string, maxAmount: number, requestKey: string) =>
    request('/wallet/passes', 'POST', { routeId, maxAmount, requestKey }),
  subscription: (routeId: string, enabled: boolean, maxAmount: number) =>
    request('/wallet/subscriptions/' + encodeURIComponent(routeId), 'PUT', { enabled, maxAmount }),
  reviewList: () => request<Withdrawal[]>('/wallet/withdrawals/review'),
  review: (id: string, status: 'PAID' | 'REJECTED', bankReference: string, note: string) =>
    request('/wallet/withdrawals/' + encodeURIComponent(id) + '/review', 'POST', {
      status,
      bankReference,
      note,
    }),
};
export function openPayment(url: string) {
  const target = new URL(url);
  if (
    target.protocol !== 'https:' &&
    !(target.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(target.hostname))
  )
    throw new Error('Liên kết thanh toán không hợp lệ.');
  window.location.assign(target.href);
}

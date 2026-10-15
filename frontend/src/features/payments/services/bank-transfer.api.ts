import { request } from '@/services/http';
import type { BankTransfer } from '../types';
export interface TransferReview {
  ticket_id: string;
  reference: string;
  customer_name: string;
  user_id: string;
  amount: number;
  status: BankTransfer['status'];
  bank_name: string;
  account_number: string;
  account_holder: string;
  created_at: string;
  sender_reference?: string;
  bank_transaction_id?: string;
  received_amount?: number;
  review_note?: string;
  route_name: string;
}
export const bankTransferApi = {
  submit: (id: string, senderReference: string) =>
    request<BankTransfer>('/bank-transfers/' + encodeURIComponent(id) + '/submitted', 'POST', {
      senderReference,
    }),
  list: () => request<TransferReview[]>('/bank-transfers/review'),
  review: (
    id: string,
    data: {
      action: 'CONFIRM' | 'REJECT';
      receivedAmount: number;
      bankTransactionId: string;
      note: string;
    }
  ) =>
    request<{ status: BankTransfer['status'] }>(
      '/bank-transfers/' + encodeURIComponent(id) + '/review',
      'POST',
      data
    ),
};

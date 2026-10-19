import { query, transaction } from '../config/database';
import { PoolClient } from 'pg';
import {
  PaymentGatewayService,
  OnlinePaymentMethod,
  assertPaymentMethodEnabled,
} from './payment-gateway.service';
import { assertEmailVerified } from './email-verification.service';

export class WalletError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'WalletError';
  }
}
export const walletFail = (message: string, status = 400): never => {
  throw new WalletError(status, message);
};
export function validateAmount(amount: unknown, minimum = 10000): asserts amount is number {
  if (
    typeof amount !== 'number' ||
    !Number.isSafeInteger(amount) ||
    amount < minimum ||
    amount > 10000000
  )
    walletFail(
      `Số tiền phải là số nguyên từ ${minimum.toLocaleString('vi-VN')} đến 10.000.000 đồng.`
    );
}
export function requestKey(key: unknown): string {
  if (typeof key !== 'string' || !/^[a-zA-Z0-9-]{16,100}$/.test(key))
    walletFail('Thiếu mã yêu cầu hợp lệ. Vui lòng tải lại trang.');
  return key as string;
}
// All monetary mutations lock this row before touching balances or ledger entries.
export async function lockWallet(client: PoolClient, userId: string) {
  await client.query(
    `INSERT INTO user_wallets(user_id,full_name) SELECT id,full_name FROM users WHERE id=$1 ON CONFLICT(user_id) DO NOTHING`,
    [userId]
  );
  const {
    rows: [wallet],
  } = await client.query('SELECT * FROM user_wallets WHERE user_id=$1 FOR UPDATE', [userId]);
  if (!wallet) walletFail('Không tìm thấy tài khoản.', 404);
  return wallet;
}
export async function changeBalance(
  client: PoolClient,
  wallet: any,
  delta: number,
  type: string,
  reference: string,
  description: string
) {
  const {
    rows: [previous],
  } = await client.query(
    'SELECT id FROM wallet_transactions WHERE wallet_id=$1 AND type=$2 AND reference_id=$3',
    [wallet.id, type, reference]
  );
  if (previous) return false;
  const before = Number(wallet.balance),
    after = before + delta;
  if (!Number.isSafeInteger(delta) || delta === 0 || !Number.isSafeInteger(after) || after < 0)
    walletFail('Số dư ví không đủ.', 409);
  if (after > 9999999999) walletFail('Số dư vượt giới hạn của ví.', 409);
  await client.query('UPDATE user_wallets SET balance=$2,updated_at=NOW() WHERE id=$1', [
    wallet.id,
    after,
  ]);
  await client.query(
    `INSERT INTO wallet_transactions(wallet_id,type,amount,balance_before,balance_after,reference_id,description) VALUES($1,$2,$3,$4,$5,$6,$7)`,
    [wallet.id, type, Math.abs(delta), before, after, reference, description]
  );
  wallet.balance = after;
  return true;
}
export const assertWalletActive = (wallet: { status: string }) => {
  if (wallet.status !== 'ACTIVE') walletFail('Ví đang bị khóa. Vui lòng liên hệ hỗ trợ.', 409);
};
export async function getWalletByUserId(userId: string) {
  const [wallet] = await query<any[]>(
    'SELECT id,user_id AS "userId",balance,status,full_name AS "fullName" FROM user_wallets WHERE user_id=$1',
    [userId]
  );
  return wallet ? { ...wallet, balance: Number(wallet.balance) } : null;
}
export interface WalletKYCData {
  fullName: string;
  dateOfBirth: string;
  citizenId: string;
  bankName: string;
  bankAccountNumber: string;
}
// Compatibility endpoint. Payout bank details are collected on each withdrawal.
export async function registerWallet(userId: string, data: WalletKYCData) {
  if (
    !data.fullName ||
    !data.dateOfBirth ||
    !data.citizenId ||
    !data.bankName ||
    !data.bankAccountNumber
  )
    walletFail('Vui lòng cung cấp đầy đủ thông tin ví.');
  await transaction(client => lockWallet(client, userId));
  return getWalletByUserId(userId);
}
export async function getTransactionHistory(userId: string) {
  return query<any[]>(
    `SELECT t.id,t.type,t.amount,t.balance_before AS "balanceBefore",t.balance_after AS "balanceAfter",t.description,t.created_at AS "createdAt" FROM wallet_transactions t JOIN user_wallets w ON w.id=t.wallet_id WHERE w.user_id=$1 ORDER BY t.created_at DESC,t.id DESC LIMIT 100`,
    [userId]
  );
}
export async function walletOverview(userId: string) {
  await transaction(client => lockWallet(client, userId));
  const [reserved] = await query<any[]>(
    "SELECT COALESCE(SUM(amount),0) AS amount FROM wallet_withdrawals WHERE user_id=$1 AND status='PENDING'",
    [userId]
  );
  return {
    reservedBalance: Number(reserved.amount),
    wallet: await getWalletByUserId(userId),
    transactions: await getTransactionHistory(userId),
    withdrawals: await query(
      'SELECT * FROM wallet_withdrawals WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100',
      [userId]
    ),
    topups: await query(
      'SELECT id,amount,method,status,payment_url,created_at FROM wallet_topups WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20',
      [userId]
    ),
    subscriptions: await query(
      `SELECT s.*,r.name AS route_name,p.expires_at FROM wallet_pass_subscriptions s JOIN routes r ON r.id=s.route_id LEFT JOIN monthly_passes p ON p.user_id=s.user_id AND p.route_id=s.route_id WHERE s.user_id=$1 ORDER BY r.name`,
      [userId]
    ),
  };
}
export async function topupWallet(
  userId: string,
  amount: number,
  method: OnlinePaymentMethod,
  key: unknown,
  ip: string
) {
  assertPaymentMethodEnabled(method);
  validateAmount(amount);
  const idempotency = requestKey(key);
  if (!['MOMO', 'VNPAY', 'ZALOPAY'].includes(method)) walletFail('Chọn cổng thanh toán hợp lệ.');
  await assertEmailVerified(userId);
  const order = await transaction(async client => {
    const wallet = await lockWallet(client, userId);
    assertWalletActive(wallet);
    const {
      rows: [existing],
    } = await client.query('SELECT * FROM wallet_topups WHERE user_id=$1 AND request_key=$2', [
      userId,
      idempotency,
    ]);
    if (existing) {
      if (Number(existing.amount) !== amount || existing.method !== method)
        walletFail('Mã yêu cầu đã dùng cho giao dịch khác.', 409);
      return existing;
    }
    const {
      rows: [created],
    } = await client.query(
      'INSERT INTO wallet_topups(user_id,amount,method,request_key) VALUES($1,$2,$3,$4) RETURNING *',
      [userId, amount, method, idempotency]
    );
    return created;
  });
  if (!order.payment_url && order.status === 'PENDING') {
    const url = await new PaymentGatewayService().createPaymentUrl(
      method,
      order.id,
      amount,
      ip,
      '/account/wallet'
    );
    await query(
      "UPDATE wallet_topups SET payment_url=COALESCE(payment_url,$2) WHERE id=$1 AND status='PENDING'",
      [order.id, url]
    );
    order.payment_url = url;
  }
  return { id: order.id, status: order.status, redirectUrl: order.payment_url };
}
// Used only after gateway signature verification; browser success flags never credit money.
export async function confirmWalletTopup(
  orderId: string,
  method: string,
  transactionId: string,
  amount: number
): Promise<boolean | null> {
  return transaction(async client => {
    const {
      rows: [identity],
    } = await client.query('SELECT user_id FROM wallet_topups WHERE id=$1', [orderId]);
    if (!identity) return null;
    const wallet = await lockWallet(client, identity.user_id);
    const {
      rows: [order],
    } = await client.query('SELECT * FROM wallet_topups WHERE id=$1 FOR UPDATE', [orderId]);
    if (order.method !== method || Number(order.amount) !== amount || !transactionId) return false;
    if (order.status === 'SUCCESS') return order.gateway_transaction_id === transactionId;
    await changeBalance(client, wallet, amount, 'TOPUP', order.id, 'Nạp tiền qua ' + method);
    await client.query(
      "UPDATE wallet_topups SET status='SUCCESS',gateway_transaction_id=$2,paid_at=NOW() WHERE id=$1",
      [order.id, transactionId]
    );
    return true;
  });
}
export async function failWalletTopup(orderId: string, method: string) {
  await query(
    "UPDATE wallet_topups SET status='FAILED' WHERE id=$1 AND method=$2 AND status='PENDING'",
    [orderId, method]
  );
}
export async function creditRefundToWallet(
  client: PoolClient,
  userId: string,
  amount: number,
  referenceId: string,
  description: string
): Promise<boolean> {
  validateAmount(amount, 1);
  const wallet = await lockWallet(client, userId);
  // Locked wallets still receive owed refunds, but cannot spend or withdraw.
  await changeBalance(client, wallet, amount, 'REFUND', referenceId, description);
  return true;
}
export async function requestWithdrawal(userId: string, data: any) {
  validateAmount(data.amount);
  const key = requestKey(data.requestKey);
  const bank = typeof data.bankName === 'string' ? data.bankName.trim() : '';
  const account = typeof data.bankAccountNumber === 'string' ? data.bankAccountNumber.trim() : '';
  const holder =
    typeof data.accountHolderName === 'string' ? data.accountHolderName.trim().toUpperCase() : '';
  if (
    bank.length < 2 ||
    bank.length > 100 ||
    !/^\d{6,34}$/.test(account) ||
    holder.length < 3 ||
    holder.length > 100
  )
    walletFail('Nhập đúng tên ngân hàng, số tài khoản (6–34 chữ số) và tên chủ tài khoản.');
  await assertEmailVerified(userId);
  return transaction(async client => {
    const wallet = await lockWallet(client, userId);
    assertWalletActive(wallet);
    const {
      rows: [existing],
    } = await client.query('SELECT * FROM wallet_withdrawals WHERE user_id=$1 AND request_key=$2', [
      userId,
      key,
    ]);
    if (existing) {
      if (
        existing.amount !== data.amount ||
        existing.bank_name !== bank ||
        existing.bank_account_number !== account ||
        existing.account_holder_name !== holder
      )
        walletFail('Mã yêu cầu đã dùng cho giao dịch khác.', 409);
      return existing;
    }
    const {
      rows: [withdrawal],
    } = await client.query(
      `INSERT INTO wallet_withdrawals(user_id,amount,bank_name,bank_account_number,account_holder_name,request_key) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
      [userId, data.amount, bank, account, holder, key]
    );
    await changeBalance(
      client,
      wallet,
      -data.amount,
      'WITHDRAWAL',
      withdrawal.id,
      'Giữ tiền cho yêu cầu rút về ' + bank
    );
    return withdrawal;
  });
}
export async function reviewWithdrawal(actor: string, id: string, data: any) {
  if (!['PAID', 'REJECTED'].includes(data.status)) walletFail('Trạng thái xử lý không hợp lệ.');
  const note = typeof data.note === 'string' ? data.note.trim() : '';
  const reference = typeof data.bankReference === 'string' ? data.bankReference.trim() : '';
  if (
    note.length > 500 ||
    (data.status === 'PAID' && (reference.length < 3 || reference.length > 150)) ||
    (data.status === 'REJECTED' && note.length < 5)
  )
    walletFail(
      'Xác nhận chuyển khoản cần mã giao dịch ngân hàng; từ chối cần lý do ít nhất 5 ký tự.'
    );
  return transaction(async client => {
    const {
      rows: [identity],
    } = await client.query('SELECT user_id FROM wallet_withdrawals WHERE id=$1', [id]);
    if (!identity) walletFail('Không tìm thấy yêu cầu.', 404);
    if (identity.user_id === actor)
      walletFail('Không thể tự duyệt yêu cầu rút tiền của mình.', 403);
    const wallet = await lockWallet(client, identity.user_id);
    const {
      rows: [row],
    } = await client.query('SELECT * FROM wallet_withdrawals WHERE id=$1 FOR UPDATE', [id]);
    if (row.status !== 'PENDING') {
      if (
        row.status === data.status &&
        (data.status !== 'PAID' || row.bank_reference === reference)
      )
        return row;
      walletFail('Yêu cầu đã được xử lý.', 409);
    }
    if (data.status === 'REJECTED')
      await changeBalance(
        client,
        wallet,
        row.amount,
        'REFUND',
        'withdrawal:' + id,
        'Hoàn lại yêu cầu rút bị từ chối: ' + note
      );
    const {
      rows: [updated],
    } = await client.query(
      `UPDATE wallet_withdrawals SET status=$2,bank_reference=$3,review_note=$4,reviewed_by=$5,reviewed_at=NOW() WHERE id=$1 RETURNING *`,
      [id, data.status, reference || null, note, actor]
    );
    return updated;
  });
}

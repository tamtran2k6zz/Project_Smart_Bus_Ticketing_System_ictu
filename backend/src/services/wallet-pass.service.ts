import { randomUUID } from 'crypto';
import { PoolClient } from 'pg';
import { query, transaction } from '../config/database';
import { activatePass } from './monthly-pass.service';
import { assertEmailVerified } from './email-verification.service';
import {
  lockWallet,
  assertWalletActive,
  changeBalance,
  requestKey,
  validateAmount,
  walletFail,
  WalletError,
} from './wallet.service';

async function priceForPass(client: PoolClient, userId: string, routeId: string) {
  const {
    rows: [route],
  } = await client.query(
    "SELECT id FROM routes WHERE id=$1 AND status='ACTIVE' AND deleted_at IS NULL",
    [routeId]
  );
  if (!route) walletFail('Tuyến không hoạt động.', 409);
  const {
    rows: [policy],
  } = await client.query(
    `SELECT p.monthly_price FROM users u JOIN fare_policies p ON p.category=CASE WHEN u.discount_status='APPROVED' THEN u.discount_type ELSE 'NONE' END WHERE u.id=$1`,
    [userId]
  );
  if (!policy) walletFail('Chưa cấu hình giá vé tháng.', 503);
  const amount = Number(policy.monthly_price);
  validateAmount(amount, 1000);
  return amount;
}
async function purchase(
  client: PoolClient,
  userId: string,
  routeId: string,
  key: string,
  maxAmount: number
) {
  // Same user lock order as gateway pass activation; concurrent purchases extend the same pass safely.
  await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [userId]);
  await assertEmailVerified(userId, client);
  const wallet = await lockWallet(client, userId);
  assertWalletActive(wallet);
  const {
    rows: [existing],
  } = await client.query('SELECT * FROM pass_orders WHERE user_id=$1 AND wallet_request_key=$2', [
    userId,
    key,
  ]);
  if (existing) {
    if (existing.route_id !== routeId) walletFail('Mã yêu cầu đã dùng cho tuyến khác.', 409);
    return existing;
  }
  const amount = await priceForPass(client, userId, routeId);
  if (amount > maxAmount)
    walletFail('Giá vé vượt hạn mức đã cho phép. Vui lòng xác nhận lại hạn mức.', 409);
  const id = randomUUID();
  await changeBalance(client, wallet, -amount, 'PAYMENT', id, 'Thanh toán vé tháng · 30 ngày');
  const pass = await activatePass(client, userId, routeId, amount);
  const {
    rows: [order],
  } = await client.query(
    `INSERT INTO pass_orders(id,user_id,route_id,pass_id,amount,payment_method,status,paid_at,gateway_transaction_id,wallet_request_key)
     VALUES($1,$2,$3,$4,$5,'WALLET','SUCCESS',NOW(),$1,$6) RETURNING *`,
    [id, userId, routeId, pass.id, amount, key]
  );
  await client.query(
    "UPDATE wallet_pass_subscriptions SET next_attempt_at=$3,last_result='Gia hạn thành công',updated_at=NOW() WHERE user_id=$1 AND route_id=$2",
    [userId, routeId, pass.expires_at]
  );
  await client.query(
    `INSERT INTO notifications(user_id,type,title,body,data) VALUES($1,'WALLET','Vé tháng đã được gia hạn',$2,$3::jsonb)`,
    [
      userId,
      `Ví đã trừ ${amount.toLocaleString('vi-VN')} đồng. Vé có hiệu lực đến ${new Date(pass.expires_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}.`,
      JSON.stringify({ link: '/account/wallet', orderId: id }),
    ]
  );
  return order;
}
export async function buyPassWithWallet(
  userId: string,
  routeId: string,
  key: unknown,
  maxAmount: number
) {
  const request = requestKey(key);
  validateAmount(maxAmount, 1000);
  return transaction(client => purchase(client, userId, routeId, request, maxAmount));
}
export async function setPassSubscription(
  userId: string,
  routeId: string,
  enabled: unknown,
  maxAmount: number
) {
  if (typeof enabled !== 'boolean') walletFail('Trạng thái tự động gia hạn không hợp lệ.');
  validateAmount(maxAmount, 1000);
  return transaction(async client => {
    await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [userId]);
    await assertEmailVerified(userId, client);
    if (enabled) {
      const amount = await priceForPass(client, userId, routeId);
      if (amount > maxAmount) walletFail('Hạn mức thấp hơn giá vé hiện tại.');
    }
    const {
      rows: [pass],
    } = await client.query(
      "SELECT expires_at FROM monthly_passes WHERE user_id=$1 AND route_id=$2 AND status='active'",
      [userId, routeId]
    );
    if (enabled && !pass) walletFail('Mua vé tháng lần đầu trước khi bật tự động gia hạn.');
    const {
      rows: [row],
    } = await client.query(
      `INSERT INTO wallet_pass_subscriptions(user_id,route_id,enabled,max_amount,next_attempt_at)
       VALUES($1,$2,$3,$4,GREATEST(NOW(),$5::timestamptz)) ON CONFLICT(user_id,route_id) DO UPDATE
       SET enabled=$3,max_amount=$4,next_attempt_at=GREATEST(NOW(),$5::timestamptz),updated_at=NOW(),last_result=NULL RETURNING *`,
      [userId, routeId, enabled, maxAmount, pass?.expires_at || new Date()]
    );
    return row;
  });
}
export async function processWalletRenewals(limit = 20) {
  // One transaction per user. Recheck due time after the user lock: safe across overlapping cron invocations.
  const candidates = await query<any[]>(
    `SELECT user_id,route_id FROM wallet_pass_subscriptions WHERE enabled AND next_attempt_at<=NOW() ORDER BY next_attempt_at LIMIT $1`,
    [limit]
  );
  let renewed = 0;
  for (const candidate of candidates) {
    const result = await transaction(async client => {
      const {
        rows: [user],
      } = await client.query('SELECT status FROM users WHERE id=$1 FOR UPDATE', [
        candidate.user_id,
      ]);
      const {
        rows: [subscription],
      } = await client.query(
        'SELECT * FROM wallet_pass_subscriptions WHERE user_id=$1 AND route_id=$2 FOR UPDATE',
        [candidate.user_id, candidate.route_id]
      );
      if (!subscription?.enabled || new Date(subscription.next_attempt_at).getTime() > Date.now())
        return false;
      const {
        rows: [pass],
      } = await client.query('SELECT * FROM monthly_passes WHERE user_id=$1 AND route_id=$2', [
        candidate.user_id,
        candidate.route_id,
      ]);
      if (pass?.status === 'active' && new Date(pass.expires_at).getTime() > Date.now()) {
        await client.query(
          'UPDATE wallet_pass_subscriptions SET next_attempt_at=$3 WHERE user_id=$1 AND route_id=$2',
          [candidate.user_id, candidate.route_id, pass.expires_at]
        );
        return false;
      }
      // Roll back any partial purchase before recording a retryable business failure.
      await client.query('SAVEPOINT renewal');
      try {
        if (user?.status !== 'ACTIVE') walletFail('Tài khoản không hoạt động.', 409);
        if (!pass || pass.status !== 'active') walletFail('Vé tháng đã bị thu hồi.', 409);
        await purchase(
          client,
          candidate.user_id,
          candidate.route_id,
          'renewal-' + pass.id + '-' + new Date(pass.expires_at).getTime(),
          subscription.max_amount
        );
        return true;
      } catch (error) {
        await client.query('ROLLBACK TO SAVEPOINT renewal');
        if (!(error instanceof WalletError) && !(error instanceof Error && 'status' in error))
          throw error;
        await client.query(
          "UPDATE wallet_pass_subscriptions SET next_attempt_at=NOW()+INTERVAL '1 day',last_result=$3,updated_at=NOW() WHERE user_id=$1 AND route_id=$2",
          [candidate.user_id, candidate.route_id, error.message]
        );
        if (subscription.last_result !== error.message)
          await client.query(
            `INSERT INTO notifications(user_id,type,title,body,data) VALUES($1,'WALLET','Chưa gia hạn được vé tháng',$2,$3::jsonb)`,
            [
              candidate.user_id,
              error.message + ' Vé đã hết hạn; kiểm tra ví và hạn mức để tiếp tục sử dụng.',
              JSON.stringify({ link: '/account/wallet', routeId: candidate.route_id }),
            ]
          );
        return false;
      }
    });
    if (result) renewed++;
  }
  return renewed;
}

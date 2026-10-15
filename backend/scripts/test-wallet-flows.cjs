const assert = require('node:assert/strict');
const { randomUUID, createHmac } = require('node:crypto');
module.exports = async ({ db, call, route, admin, momoCallback }) => {
  const base = '/api/smartbus/v1';
  const registered = await call(
    'post',
    base + '/auth/register',
    {
      name: 'Khách ví',
      email: 'wallet@example.test',
      phone: '0908899001',
      password: 'Wallet@12345',
    },
    null,
    201
  );
  const token = registered.data.tokens.accessToken,
    userId = registered.data.user.id;
  const registered2 = await call(
    'post',
    base + '/auth/register',
    {
      name: 'Khách khác',
      email: 'wallet2@example.test',
      phone: '0908899002',
      password: 'Wallet@12345',
    },
    null,
    201
  );
  const other = registered2.data.tokens.accessToken;
  await db.query('UPDATE users SET email_verified_at=NOW() WHERE id=$1', [userId]);
  const overview = () => call('get', base + '/wallet', null, token);
  const balance = async () => Number((await overview()).wallet.balance);
  assert.equal(await balance(), 0);
  await call('get', base + '/wallet', null, null, 401);
  await call('get', base + '/wallet/withdrawals/review', null, token, 403);
  for (const amount of [-1, 0, 1, 10000.5, '10000', 10000001, null]) {
    await call(
      'post',
      base + '/wallet/topup',
      { amount, method: 'MOMO', requestKey: randomUUID() },
      token,
      400
    );
  }
  // The former unsafe direct-credit endpoint now requires a gateway order.
  await call('post', '/api/v1/wallet/topup', { amount: 100000 }, token, 400);
  assert.equal(await balance(), 0);
  const topupBody = { amount: 1000000, method: 'MOMO', requestKey: randomUUID() };
  const order = await call('post', base + '/wallet/topup', topupBody, token);
  assert.ok(order.redirectUrl);
  assert.equal((await call('post', base + '/wallet/topup', topupBody, token)).id, order.id);
  assert.equal(await balance(), 0, 'order creation must not credit money');
  await call(
    'post',
    '/api/v1/ticketing/payments/momo/ipn',
    momoCallback(order.id, 1, 99100),
    null,
    400
  );
  const forged = { ...momoCallback(order.id, 1000000, 99100), signature: 'bad' };
  await call('post', '/api/v1/ticketing/payments/momo/ipn', forged, null, 400);
  assert.equal(await balance(), 0);
  const success = momoCallback(order.id, 1000000, 99100);
  await call('post', '/api/v1/ticketing/payments/momo/ipn', success);
  await call('post', '/api/v1/ticketing/payments/momo/ipn', success);
  assert.equal(await balance(), 1000000, 'callback replay credits exactly once');
  const withdrawal = {
    amount: 100000,
    bankName: 'Vietcombank',
    bankAccountNumber: '0123456789',
    accountHolderName: 'KHACH VI',
    requestKey: randomUUID(),
  };
  const pending = await call('post', base + '/wallet/withdrawals', withdrawal, token);
  assert.equal(pending.status, 'PENDING');
  assert.equal(await balance(), 900000);
  assert.equal(
    (await call('post', base + '/wallet/withdrawals', withdrawal, token)).id,
    pending.id
  );
  await call('post', base + '/wallet/withdrawals', { ...withdrawal, amount: 200000 }, token, 409);
  await call(
    'post',
    base + '/wallet/withdrawals',
    { ...withdrawal, amount: 1000000, requestKey: randomUUID() },
    token,
    409
  );
  await call(
    'post',
    base + '/wallet/withdrawals/' + pending.id + '/review',
    { status: 'REJECTED', note: 'Sai thông tin' },
    other,
    403
  );
  const rejection = { status: 'REJECTED', note: 'Thông tin ngân hàng chưa chính xác' };
  await call('post', base + '/wallet/withdrawals/' + pending.id + '/review', rejection, admin);
  await call('post', base + '/wallet/withdrawals/' + pending.id + '/review', rejection, admin);
  assert.equal(await balance(), 1000000, 'rejection returns reserved funds exactly once');
  const paid = await call(
    'post',
    base + '/wallet/withdrawals',
    { ...withdrawal, requestKey: randomUUID() },
    token
  );
  await call(
    'post',
    base + '/wallet/withdrawals/' + paid.id + '/review',
    { status: 'PAID' },
    admin,
    400
  );
  await call(
    'post',
    base + '/wallet/withdrawals/' + paid.id + '/review',
    { status: 'PAID', bankReference: 'BANK-2026-WALLET-1' },
    admin
  );
  await call(
    'post',
    base + '/wallet/withdrawals/' + paid.id + '/review',
    { status: 'REJECTED', note: 'Không được hoàn hai lần' },
    admin,
    409
  );
  assert.equal(await balance(), 900000);
  assert.equal((await call('get', base + '/wallet', null, other)).withdrawals.length, 0);
  // Refunds create wallets for passengers who have never opened the wallet page.
  const walletService = require('../dist/services/wallet.service');
  const { transaction } = require('../dist/config/database');
  await transaction(async c => {
    await walletService.creditRefundToWallet(
      c,
      registered2.data.user.id,
      70000,
      'test-refund',
      'Hoàn tiền vé'
    );
    await walletService.creditRefundToWallet(
      c,
      registered2.data.user.id,
      70000,
      'test-refund',
      'Hoàn tiền vé'
    );
  });
  assert.equal(Number((await call('get', base + '/wallet', null, other)).wallet.balance), 70000);
  await db.query("UPDATE routes SET status='ACTIVE',deleted_at=NULL WHERE id=$1", [route]);
  const passBody = { routeId: route, maxAmount: 250000, requestKey: randomUUID() };
  const passOrder = await call('post', base + '/wallet/passes', passBody, token);
  assert.equal(passOrder.payment_method, 'WALLET');
  assert.equal(await balance(), 650000);
  await call('post', base + '/wallet/passes', passBody, token);
  assert.equal(await balance(), 650000);
  const subscriptionPath = base + '/wallet/subscriptions/' + route;
  await call('put', subscriptionPath, { enabled: true, maxAmount: 250000 }, token);
  const { processWalletRenewals } = require('../dist/services/wallet-pass.service');
  assert.equal(await processWalletRenewals(), 0, 'active passes must not be charged early');
  await db.query(
    "UPDATE monthly_passes SET starts_at=NOW()-INTERVAL '31 days',expires_at=NOW()-INTERVAL '1 day' WHERE user_id=$1",
    [userId]
  );
  await db.query(
    "UPDATE wallet_pass_subscriptions SET next_attempt_at=NOW()-INTERVAL '1 day' WHERE user_id=$1",
    [userId]
  );
  await Promise.all([processWalletRenewals(), processWalletRenewals()]);
  assert.equal(await balance(), 400000, 'overlapping renewal workers debit once');
  assert.ok(
    Date.parse((await call('get', base + '/passes', null, token)).passes[0].expiresAt) > Date.now()
  );
  // Price changes above consent cap cannot silently spend more.
  await db.query(
    "UPDATE monthly_passes SET starts_at=NOW()-INTERVAL '31 days',expires_at=NOW()-INTERVAL '1 day' WHERE user_id=$1",
    [userId]
  );
  await db.query(
    "UPDATE wallet_pass_subscriptions SET next_attempt_at=NOW()-INTERVAL '1 day',max_amount=1000 WHERE user_id=$1",
    [userId]
  );
  assert.equal(await processWalletRenewals(), 0);
  assert.equal(await balance(), 400000);
  assert.match((await overview()).subscriptions[0].last_result, /hạn mức/);
  await call('put', subscriptionPath, { enabled: false, maxAmount: 250000 }, token);
  assert.equal(await processWalletRenewals(), 0);
  // Insufficient money must not create an order, extend a pass, or leave a debit.
  await call('post', base + '/wallet/passes', { ...passBody, requestKey: randomUUID() }, token);
  assert.equal(await balance(), 150000);
  await db.query(
    "UPDATE monthly_passes SET starts_at=NOW()-INTERVAL '31 days',expires_at=NOW()-INTERVAL '1 day' WHERE user_id=$1",
    [userId]
  );
  await call('put', subscriptionPath, { enabled: true, maxAmount: 250000 }, token);
  assert.equal(
    await processWalletRenewals(),
    0,
    'insufficient funds must leave the expired pass and balance unchanged'
  );
  assert.match((await overview()).subscriptions[0].last_result, /không đủ/);
  assert.equal(await balance(), 150000);
  await call(
    'post',
    base + '/wallet/passes',
    { ...passBody, requestKey: randomUUID() },
    token,
    409
  );
  assert.equal(await balance(), 150000);
  await db.query("UPDATE user_wallets SET status='LOCKED' WHERE user_id=$1", [userId]);
  await call(
    'post',
    base + '/wallet/withdrawals',
    { ...withdrawal, requestKey: randomUUID() },
    token,
    409
  );
  await call(
    'post',
    base + '/wallet/passes',
    { ...passBody, requestKey: randomUUID() },
    token,
    409
  );
  // Sum of all ledger deltas reconciles exactly to the balance.
  const snapshot = await overview();
  assert.equal(
    snapshot.transactions.reduce((a, t) => a + Number(t.balanceAfter) - Number(t.balanceBefore), 0),
    snapshot.wallet.balance
  );
  // Both other supported gateways use the same verified, idempotent credit path.
  await db.query('UPDATE users SET email_verified_at=NOW() WHERE id=$1', [
    registered2.data.user.id,
  ]);
  const vn = await call(
    'post',
    base + '/wallet/topup',
    { amount: 10000, method: 'VNPAY', requestKey: randomUUID() },
    other
  );
  const vnFields = {
    vnp_Amount: '1000000',
    vnp_ResponseCode: '00',
    vnp_TransactionStatus: '00',
    vnp_TransactionNo: 'VN-WALLET-1',
    vnp_TxnRef: vn.id,
    vnp_TmnCode: process.env.VNPAY_TMN_CODE,
  };
  const vnQuery = new URLSearchParams(
    Object.keys(vnFields)
      .sort()
      .map(key => [key, vnFields[key]])
  ).toString();
  const vnBody = {
    ...vnFields,
    vnp_SecureHash: createHmac('sha512', process.env.VNPAY_HASH_SECRET)
      .update(vnQuery)
      .digest('hex'),
  };
  assert.equal((await call('post', '/api/v1/ticketing/payments/vnpay/ipn', vnBody)).RspCode, '00');
  await call('post', '/api/v1/ticketing/payments/vnpay/ipn', vnBody);
  const zalo = await call(
    'post',
    base + '/wallet/topup',
    { amount: 10000, method: 'ZALOPAY', requestKey: randomUUID() },
    other
  );
  const mapping = (
    await db.query('SELECT app_trans_id FROM zalopay_orders WHERE order_id=$1', [zalo.id])
  ).rows[0];
  const zaloData = JSON.stringify({
    app_id: Number(process.env.ZALOPAY_APP_ID),
    app_trans_id: mapping.app_trans_id,
    amount: 10000,
    zp_trans_id: '99100123',
  });
  const zaloBody = {
    type: 1,
    data: zaloData,
    mac: createHmac('sha256', process.env.ZALOPAY_KEY2).update(zaloData).digest('hex'),
  };
  assert.equal(
    (await call('post', '/api/v1/ticketing/payments/zalopay/ipn', zaloBody)).return_code,
    1
  );
  await call('post', '/api/v1/ticketing/payments/zalopay/ipn', zaloBody);
  assert.equal(Number((await call('get', base + '/wallet', null, other)).wallet.balance), 90000);
  for (const role of ['anon', 'authenticated']) {
    await db.exec('SET ROLE ' + role);
    await assert.rejects(db.query('SELECT * FROM wallet_withdrawals'), e => e.code === '42501');
    await assert.rejects(db.query('SELECT * FROM user_wallets'), e => e.code === '42501');
    await db.exec('RESET ROLE');
  }
  console.log(
    'PASS: wallet top-up, callback verification, refund, withdrawal review, ledger reconciliation and automatic pass renewal'
  );
};

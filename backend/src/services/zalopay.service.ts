import { createHmac, timingSafeEqual } from 'crypto';
import { query } from '../config/database';
import { getGatewayCallbacks, getPublicBaseUrl, readEnv } from '../config/env';
const required = (name: string) => {
  const value = readEnv(name);
  if (!value) throw Object.assign(new Error('Thiếu cấu hình ' + name), { status: 503 });
  return value;
};
const mac = (value: string, key = required('ZALOPAY_KEY1')) =>
  createHmac('sha256', key).update(value).digest('hex');
function datePrefix(date: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const p = Object.fromEntries(parts.map(x => [x.type, x.value]));
  return p.year + p.month + p.day;
}
async function post(url: string, body: Record<string, any>) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(
      Object.fromEntries(Object.entries(body).map(([k, v]) => [k, String(v)]))
    ),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error('ZaloPay HTTP ' + response.status);
  return (await response.json()) as any;
}
export async function createZalopayPayment(orderId: string, amount: number, resultPath?: string) {
  const appId = required('ZALOPAY_APP_ID');
  let [mapping] = await query<any[]>('SELECT * FROM zalopay_orders WHERE order_id=$1', [orderId]);
  if (!mapping) {
    const [created] = await query<any[]>(
      'INSERT INTO zalopay_orders(app_trans_id,order_id) VALUES($1,$2) ON CONFLICT(order_id) DO UPDATE SET order_id=$2 RETURNING *',
      [datePrefix(new Date()) + '_' + orderId.replace(/-/g, '').slice(0, 30), orderId]
    );
    mapping = created;
  }
  const redirect = new URL(getGatewayCallbacks().paymentResultUrl);
  if (resultPath) {
    redirect.pathname = resultPath;
    redirect.search = '';
  }
  redirect.searchParams.set('paymentOrder', orderId);
  const body: Record<string, any> = {
    app_id: appId,
    app_trans_id: mapping.app_trans_id,
    app_user: orderId,
    app_time: Date.now(),
    amount,
    item: '[]',
    embed_data: JSON.stringify({ redirecturl: redirect.toString() }),
    description: 'SmartBus ' + orderId,
    callback_url:
      readEnv('ZALOPAY_CALLBACK_URL') ||
      getPublicBaseUrl() + '/api/v1/ticketing/payments/zalopay/ipn',
  };
  body.mac = mac(
    [
      body.app_id,
      body.app_trans_id,
      body.app_user,
      body.amount,
      body.app_time,
      body.embed_data,
      body.item,
    ].join('|')
  );
  const reply = await post(
    readEnv('ZALOPAY_CREATE_URL') || 'https://sb-openapi.zalopay.vn/v2/create',
    body
  );
  if (Number(reply.return_code) !== 1 || typeof reply.order_url !== 'string')
    throw new Error('ZaloPay không tạo được đơn thanh toán.');
  return reply.order_url as string;
}
export async function verifiedZalopayCallback(payload: any) {
  if (
    typeof payload.data !== 'string' ||
    typeof payload.mac !== 'string' ||
    !/^[a-f0-9]{64}$/i.test(payload.mac) ||
    payload.type !== 1
  )
    return null;
  const expected = mac(payload.data, required('ZALOPAY_KEY2'));
  if (
    expected.length !== payload.mac.length ||
    !timingSafeEqual(Buffer.from(expected), Buffer.from(payload.mac.toLowerCase()))
  )
    return null;
  let data: any;
  try {
    data = JSON.parse(payload.data);
  } catch {
    return null;
  }
  if (
    String(data.app_id) !== required('ZALOPAY_APP_ID') ||
    !Number.isSafeInteger(Number(data.amount)) ||
    Number(data.amount) <= 0 ||
    !/^[0-9]+$/.test(String(data.zp_trans_id))
  )
    return null;
  const [mapping] = await query<any[]>(
    'SELECT order_id FROM zalopay_orders WHERE app_trans_id=$1',
    [data.app_trans_id]
  );
  return mapping
    ? {
        orderId: mapping.order_id,
        amount: Number(data.amount),
        transactionId: String(data.zp_trans_id),
      }
    : null;
}
export async function refundZalopay(payment: {
  refundRequestId: string;
  gatewayTransactionId?: string | null;
  amount: number;
  paidAt: Date | null;
}) {
  const appId = required('ZALOPAY_APP_ID');
  if (!payment.paidAt) throw new Error('Thiếu thời điểm thanh toán gốc.');
  const [intent] = await query<any[]>('SELECT created_at FROM refund_jobs WHERE request_id=$1', [
    payment.refundRequestId,
  ]);
  if (!intent) throw new Error('Thiếu yêu cầu hoàn tiền đã lưu.');
  const refundId =
    datePrefix(new Date(intent.created_at)) +
    '_' +
    appId +
    '_' +
    payment.refundRequestId.replace(/-/g, '').slice(0, 22);
  const lookup: Record<string, any> = {
    app_id: appId,
    m_refund_id: refundId,
    timestamp: Date.now(),
  };
  lookup.mac = mac([appId, refundId, lookup.timestamp].join('|'));
  const status = await post(
    readEnv('ZALOPAY_QUERY_REFUND_URL') || 'https://sb-openapi.zalopay.vn/v2/query_refund',
    lookup
  );
  if (Number(status.return_code) === 1) return;
  if (Number(status.return_code) === 3)
    throw new Error('ZaloPay đang xử lý hoàn tiền; chờ đối soát.');
  const body: Record<string, any> = {
    app_id: appId,
    m_refund_id: refundId,
    zp_trans_id: payment.gatewayTransactionId,
    amount: payment.amount,
    description: 'SmartBus refund',
    timestamp: Date.now(),
  };
  body.mac = mac(
    [appId, body.zp_trans_id, body.amount, body.description, body.timestamp].join('|')
  );
  const result = await post(
    readEnv('ZALOPAY_REFUND_URL') || 'https://sb-openapi.zalopay.vn/v2/refund',
    body
  );
  if (![1, 3].includes(Number(result.return_code)))
    throw new Error('ZaloPay từ chối yêu cầu hoàn tiền.');
  // Acceptance is not settlement. The worker must query again before marking refunded.
  throw new Error('ZaloPay đã nhận yêu cầu; chờ xác nhận hoàn tiền.');
}

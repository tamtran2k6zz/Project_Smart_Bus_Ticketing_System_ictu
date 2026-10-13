import { randomUUID } from 'crypto';
import { query } from '../config/database';
import { readEnv, isProduction } from '../config/env';
import { sendEmail } from './email.service';
const fail = (message: string, status = 400): never => {
  throw Object.assign(new Error(message), { status });
};
const escapeHtml = (value: unknown) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
  );
export function invoiceHtml(row: any) {
  const p = row.payload;
  return (
    '<!doctype html><html lang="vi"><meta charset="utf-8"><title>' +
    escapeHtml(row.number) +
    '</title><body style="font:16px Arial;max-width:800px;margin:40px auto"><h1>SmartBus · Hóa đơn điện tử' +
    (row.kind === 'demo' ? ' DEMO' : '') +
    '</h1>' +
    (row.kind === 'demo'
      ? '<p><strong>Bản mô phỏng phục vụ báo cáo, không phải hóa đơn thuế đã phát hành.</strong></p>'
      : '') +
    '<p>Số: ' +
    escapeHtml(row.number) +
    '</p><p>Đơn vị: ' +
    escapeHtml(p.seller) +
    '</p><p>Khách hàng: ' +
    escapeHtml(p.customer) +
    '</p><p>Mã đặt vé: ' +
    escapeHtml(p.bookingId) +
    '</p><p>Tuyến: ' +
    escapeHtml(p.route) +
    '</p><p>Số vé: ' +
    escapeHtml(p.quantity) +
    '</p><p>Tổng tiền: ' +
    escapeHtml(p.amount) +
    ' VND</p><p>Thời điểm: ' +
    escapeHtml(row.created_at) +
    '</p>' +
    (row.document_url
      ? '<p><a href="' +
        escapeHtml(row.document_url) +
        '">Tra cứu chứng từ gốc của nhà cung cấp</a></p>'
      : '') +
    '</body></html>'
  );
}
export async function issueBookingInvoice(bookingId: string, userId: string) {
  const [b] = await query<any[]>(
    `SELECT ub.*,h.user_id,h.quantity,u.email,r.name AS route,p.status AS payment_status FROM ui_bookings ub JOIN ui_holds h ON h.id=ub.hold_id JOIN users u ON u.id=h.user_id JOIN trips tr ON tr.id=h.trip_id JOIN routes r ON r.id=tr.route_id JOIN payment_transactions p ON p.ticket_id=ub.ticket_id WHERE ub.id=$1 AND h.user_id=$2`,
    [bookingId, userId]
  );
  if (!b) fail('Không tìm thấy đặt vé.', 404);
  if (b.payment_status !== 'SUCCESS') fail('Chỉ phát hành cho giao dịch đã thanh toán.', 409);
  const demo =
    readEnv('INVOICE_MODE') === 'demo' &&
    readEnv('LOCAL_DEMO_ENABLED') === 'true' &&
    !isProduction() &&
    readEnv('VERCEL_ENV') !== 'production';
  if (!demo && (!readEnv('INVOICE_API_URL') || !readEnv('INVOICE_API_TOKEN')))
    fail('Nhà xe chưa cấu hình nhà cung cấp hóa đơn điện tử.', 503);
  const id = randomUUID();
  const [row] = await query<any[]>(
    `INSERT INTO electronic_invoices(id,booking_id,number,kind,payload) VALUES($1,$2,$3,$4,$5) ON CONFLICT(booking_id) DO UPDATE SET booking_id=$2 RETURNING *`,
    [
      id,
      bookingId,
      (demo ? 'DEMO-' : 'SB-') + id,
      demo ? 'demo' : 'provider',
      JSON.stringify({
        seller: readEnv('INVOICE_SELLER_NAME') || 'SmartBus',
        customer: b.name,
        bookingId,
        quantity: b.quantity,
        amount: Number(b.total),
        route: b.route,
      }),
    ]
  );
  if (row.kind === 'demo' && !demo)
    fail('Hóa đơn demo không thể phát hành trong môi trường thật.', 409);
  if (row.status !== 'issued') {
    if (!demo) {
      const response = await fetch(readEnv('INVOICE_API_URL')!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + readEnv('INVOICE_API_TOKEN'),
          'Idempotency-Key': row.id,
        },
        body: JSON.stringify({ reference: row.id, ...row.payload }),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok)
        fail('Nhà cung cấp hóa đơn chưa xác nhận; có thể thử lại cùng mã yêu cầu.', 502);
      const issued: any = await response.json();
      if (
        issued.status !== 'issued' ||
        typeof issued.number !== 'string' ||
        typeof issued.reference !== 'string' ||
        typeof issued.documentUrl !== 'string' ||
        !issued.documentUrl.startsWith('https://')
      )
        fail('Phản hồi phát hành hóa đơn không hợp lệ.', 502);
      await query(
        "UPDATE electronic_invoices SET status='issued',number=$2,provider_reference=$3,document_url=$4 WHERE id=$1",
        [row.id, issued.number, issued.reference, issued.documentUrl]
      );
      Object.assign(row, {
        status: 'issued',
        number: issued.number,
        provider_reference: issued.reference,
        document_url: issued.documentUrl,
      });
    } else {
      await query("UPDATE electronic_invoices SET status='issued' WHERE id=$1", [row.id]);
      row.status = 'issued';
    }
  }
  if (!row.email_sent_at) {
    const html = invoiceHtml(row);
    const delivered = await sendEmail(
      b.email,
      'SmartBus · ' + (demo ? 'Hóa đơn DEMO ' : 'Hóa đơn ') + row.number,
      'Số hóa đơn: ' +
        row.number +
        '; Số tiền: ' +
        b.total +
        ' VND' +
        (row.document_url ? '\nTra cứu: ' + row.document_url : ''),
      {
        html,
        attachments: [{ filename: row.number + '.html', content: html, contentType: 'text/html' }],
      }
    );
    if (!delivered) fail('Hóa đơn đã lưu nhưng email chưa gửi được. Vui lòng thử lại.', 503);
    await query('UPDATE electronic_invoices SET email_sent_at=NOW() WHERE id=$1', [row.id]);
  }
  await query('UPDATE ui_bookings SET invoice_requested=true WHERE id=$1', [bookingId]);
  return {
    id: row.id,
    number: row.number,
    kind: row.kind,
    documentUrl: row.document_url,
    message: demo
      ? 'Đã gửi hóa đơn DEMO; không dùng làm hóa đơn thuế.'
      : 'Đã gửi hóa đơn điện tử qua email.',
  };
}

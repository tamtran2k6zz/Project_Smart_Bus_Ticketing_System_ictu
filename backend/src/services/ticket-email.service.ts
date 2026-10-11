import QRCode from 'qrcode';
import { PoolClient } from 'pg';
import { query, transaction } from '../config/database';
import { appLogger } from '../config/logger';
import { sendEmail } from './email.service';
import { frontendUrl } from './email-verification.service';
import { buildQrPayload, computeQrSignature } from './ticket.service';

const escapeHtml = (value: unknown) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]
  );

export async function queueTicketEmail(client: PoolClient, ticketId: string): Promise<void> {
  await client.query(
    'INSERT INTO ticket_email_deliveries(ticket_id) VALUES($1) ON CONFLICT(ticket_id) DO NOTHING',
    [ticketId]
  );
}

export async function deliverTicketEmail(ticketId: string): Promise<boolean> {
  // Persisted claim prevents parallel/repeated gateway callbacks sending twice.
  const ticket = await transaction(async client => {
    const {
      rows: [claimed],
    } = await client.query(
      `UPDATE ticket_email_deliveries SET status='processing',claimed_at=NOW(),attempts=attempts+1
      WHERE ticket_id=$1 AND attempts<5 AND next_attempt_at<=NOW() AND
      (status='pending' OR (status='processing' AND claimed_at<NOW()-INTERVAL '2 minutes')) RETURNING ticket_id`,
      [ticketId]
    );
    if (!claimed) return null;
    const {
      rows: [t],
    } = await client.query(
      `SELECT t.*,u.email,u.email_verified_at,u.full_name,p.amount,p.status AS payment_status,
      tr.departure_time,tr.arrival_time,r.name AS route_name,b.id AS booking_id,
      COALESCE(b.name,u.full_name) AS passenger_name,bs.name AS boarding_name,als.name AS alighting_name,
      COALESCE(rs.estimated_time_minutes,0) AS boarding_minutes,
      COALESCE((SELECT string_agg(s.seat_number,', ' ORDER BY s.seat_number) FROM trip_seats s WHERE s.ticket_id=t.id),t.seat_number) AS seats
      FROM tickets t JOIN users u ON u.id=t.user_id JOIN payment_transactions p ON p.ticket_id=t.id
      JOIN trips tr ON tr.id=t.trip_id JOIN routes r ON r.id=tr.route_id
      LEFT JOIN ui_bookings b ON b.ticket_id=t.id LEFT JOIN ui_holds h ON h.id=b.hold_id
      LEFT JOIN bus_stops bs ON bs.id=h.boarding_stop_id LEFT JOIN bus_stops als ON als.id=h.alighting_stop_id
      LEFT JOIN route_stops rs ON rs.route_id=tr.route_id AND rs.stop_id=h.boarding_stop_id WHERE t.id=$1`,
      [ticketId]
    );
    if (!t || t.payment_status !== 'SUCCESS' || !['BOOKED', 'CHECKED_IN'].includes(t.status)) {
      await client.query("UPDATE ticket_email_deliveries SET status='skipped' WHERE ticket_id=$1", [
        ticketId,
      ]);
      return null;
    }
    return t;
  });
  if (!ticket) return false;
  let delivered = false;
  try {
    if (!ticket.email_verified_at) throw new Error('Email chưa xác minh.');
    const link = frontendUrl('/account/tickets/' + encodeURIComponent(ticket.id));
    const payload = buildQrPayload(ticket, { withSecurity: true });
    // A ticket purchased days ahead must remain scannable on the travel date.
    payload.exp = Math.ceil((Date.parse(ticket.arrival_time) + 90 * 60_000) / 1000);
    payload.sig = computeQrSignature(payload);
    if (!payload.sig || !Number.isFinite(payload.exp)) throw new Error('Không tạo được QR hợp lệ.');
    const png = await QRCode.toBuffer(JSON.stringify(payload));
    const departure = new Date(
      Date.parse(ticket.departure_time) + Number(ticket.boarding_minutes) * 60_000
    ).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    const details = `Hành khách: ${ticket.passenger_name}\nTuyến: ${ticket.route_name}\nGiờ đón dự kiến: ${departure}\nTrạm đón: ${ticket.boarding_name || 'Điểm đầu tuyến'}\nTrạm xuống: ${ticket.alighting_name || 'Điểm cuối tuyến'}\nGhế: ${ticket.seats}\nSố vé: ${ticket.quantity}\nĐã thanh toán: ${Number(ticket.amount).toLocaleString('vi-VN')} đ\nMã vé: ${ticket.ticket_code}`;
    delivered = await sendEmail(
      ticket.email,
      '[SmartBus] Vé điện tử ' + ticket.ticket_code,
      `Đặt vé và thanh toán thành công.\n${details}\nXem vé mới nhất: ${link.href}\nQR đính kèm dùng cho toàn bộ nhóm ghế. Khi hủy/đổi chuyến, kiểm tra vé mới nhất trong tài khoản.`,
      {
        html: `<h2>Vé điện tử SmartBus</h2><p>Thanh toán thành công.</p><p>${escapeHtml(details).replace(/\n/g, '<br>')}</p><img src="cid:smartbus-ticket-qr" alt="Mã QR vé" width="240"><p><a href="${escapeHtml(link.href)}">Xem vé mới nhất</a></p><p>QR dùng cho toàn bộ nhóm ghế. Khi hủy/đổi chuyến, kiểm tra vé trong tài khoản.</p>`,
        attachments: [
          {
            filename: 'smartbus-qr.png',
            content: png,
            cid: 'smartbus-ticket-qr',
            contentType: 'image/png',
          },
        ],
      }
    );
  } catch (error) {
    appLogger.error('ticket_email_delivery_failed', { ticket_id: ticketId, error });
  }
  await query(
    `UPDATE ticket_email_deliveries SET status=CASE WHEN $2 THEN 'sent' WHEN attempts>=5 THEN 'failed' ELSE 'pending' END,sent_at=CASE WHEN $2 THEN NOW() ELSE sent_at END,
    next_attempt_at=NOW()+INTERVAL '5 minutes' WHERE ticket_id=$1 AND status='processing'`,
    [ticketId, delivered]
  );
  return delivered;
}

export async function processPendingTicketEmails(limit = 1): Promise<number> {
  const rows = await query<any[]>(
    `SELECT ticket_id FROM ticket_email_deliveries WHERE attempts<5 AND next_attempt_at<=NOW()
    AND (status='pending' OR (status='processing' AND claimed_at<NOW()-INTERVAL '2 minutes')) ORDER BY next_attempt_at LIMIT $1`,
    [limit]
  );
  let sent = 0;
  for (const row of rows) if (await deliverTicketEmail(row.ticket_id)) sent++;
  return sent;
}

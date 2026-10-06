import { createHash, createHmac, randomUUID, timingSafeEqual } from 'crypto';
import * as QRCode from 'qrcode';
import { query, transaction } from '../config/database';
import { readEnv } from '../config/env';
import { createLogger } from '../config/logger';
import {
  acquireTicketValidationLock,
  releaseTicketValidationLock,
  setIfAbsent,
} from '../config/redis';

const logger = createLogger('ticket-service');

/**
 * Sprint 3 — US 15 Soát vé QR.
 *
 * Dịch vụ kiểm tra hợp lệ vé điện tử khi tài xế/điều hành quét mã QR.
 * Mọi lần soát (hợp lệ, trùng lặp, bị từ chối) đều được ghi vào bảng
 * ticket_validation_logs để phục vụ kiểm toán.
 *
 * Đồng thời là nơi duy nhất sinh nội dung QR vé (buildQrPayload /
 * generateTicketQrDataUrl) để ticket-details route tái sử dụng.
 */
export class TicketValidationError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'TicketValidationError';
  }
}

export type TicketValidationOutcome = 'VALID' | 'ALREADY_USED' | 'REJECTED';

export interface TicketQrPayload {
  ticket_code: string;
  trip_id: string;
  seat_number: string | null;
  status: string;
  /** Unix seconds — hạn sử dụng QR (tùy chọn, bật qua QR_EXP_MINUTES). */
  exp?: number;
  /** Nonce chống replay (Redis anti-replay, bật mặc định khi ký QR). */
  nonce?: string;
  /** Chữ ký HMAC-SHA256 của payload (bỏ trường sig). */
  sig?: string;
}

export interface ValidatedTicketInfo {
  id: string;
  ticketCode: string;
  seatNumber: string | null;
  fareAmount: number;
  status: 'CHECKED_IN';
  user: { fullName: string | null; email: string | null };
  trip: { route: { name: string; code: string } };
}

export interface ValidateTicketQrInput {
  code: string;
  tripId?: string;
  stopId?: string;
  latitude?: number;
  longitude?: number;
  validatedBy?: string;
}

export interface ValidateTicketQrResult {
  isAlreadyCheckedIn: boolean;
  validationId: string | null;
  qrCodeHash: string;
  ticket: ValidatedTicketInfo;
}

/** Lỗi veto nội bộ: mang theo đủ thông tin để ghi log REJECTED sau transaction. */
class RejectedTicketError extends TicketValidationError {
  constructor(
    status: number,
    message: string,
    public reason: string,
    public ticketId: string,
    public tripId: string
  ) {
    super(status, message);
    this.name = 'RejectedTicketError';
  }
}

export interface BuildQrPayloadOptions {
  /**
   * Kèm security fields: exp (hết hạn), nonce (anti-replay) và sig
   * (HMAC-SHA256). Dùng cho QR image sinh từ ticket-details route.
   */
  withSecurity?: boolean;
}

/** TTL của nonce anti-replay — quét lại cùng QR trong cửa sổ này bị coi là replay. */
const QR_NONCE_TTL_SECONDS = 600;

/**
 * Bí mật ký QR: ưu tiên QR_HMAC_SECRET, mặc định dùng chung JWT_SECRET.
 * Trả về null khi chưa cấu hình (payload sẽ không được ký / không xác minh).
 */
function getQrHmacSecret(): string | null {
  return readEnv('QR_HMAC_SECRET') || readEnv('JWT_SECRET') || null;
}

export interface QrSignatureInput {
  ticket_code: string;
  trip_id: string;
  seat_number: string | null;
  exp?: number;
  nonce?: string;
}

/**
 * HMAC-SHA256 trên chuỗi chuẩn hóa ticket_code|trip_id|seat_number|exp|nonce.
 * Trả về hex string, hoặc null nếu chưa có bí mật ký.
 */
export function computeQrSignature(input: QrSignatureInput): string | null {
  const secret = getQrHmacSecret();
  if (!secret) return null;
  const canonical = [
    input.ticket_code,
    input.trip_id,
    input.seat_number ?? '',
    input.exp ?? '',
    input.nonce ?? '',
  ].join('|');
  return createHmac('sha256', secret).update(canonical).digest('hex');
}

/** So sánh hex an toàn timing, chấp nhận cả chữ thường/hoa. */
function hexesEqualHex(expected: string, provided: string): boolean {
  if (!/^[0-9a-f]{64}$/i.test(provided)) return false;
  const bufA = Buffer.from(expected, 'hex');
  const bufB = Buffer.from(provided.toLowerCase(), 'hex');
  return bufA.length > 0 && bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export function buildQrPayload(
  ticket: {
    ticket_code: string;
    trip_id: string;
    seat_number: string | null;
    status: string;
  },
  options: BuildQrPayloadOptions = {}
): TicketQrPayload {
  const payload: TicketQrPayload = {
    ticket_code: ticket.ticket_code,
    trip_id: ticket.trip_id,
    seat_number: ticket.seat_number,
    status: ticket.status,
  };
  if (!options.withSecurity) return payload;

  // Hết hạn: QR_EXP_MINUTES=0 để tắt (mặc định 24h).
  const expMinutes = Number(readEnv('QR_EXP_MINUTES') ?? '1440');
  if (Number.isFinite(expMinutes) && expMinutes > 0) {
    payload.exp = Math.floor(Date.now() / 1000) + Math.round(expMinutes * 60);
  }
  // Anti-replay: QR_ANTI_REPLAY=false để tắt (mặc định bật).
  if (readEnv('QR_ANTI_REPLAY') !== 'false') {
    payload.nonce = randomUUID();
  }
  payload.sig = computeQrSignature(payload);
  if (!payload.sig) delete payload.sig;
  return payload;
}

export async function generateTicketQrDataUrl(payload: TicketQrPayload): Promise<string> {
  return QRCode.toDataURL(JSON.stringify(payload), {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    width: 300,
    margin: 1,
    color: { dark: '#000000', light: '#FFFFFF' },
  });
}

export interface ParsedQrScan {
  code: string;
  embeddedTripId?: string;
  exp?: number;
  nonce?: string;
  sig?: string;
}

/**
 * Nhận chuỗi QR từ máy quét: chấp nhận JSON {ticket_code, trip_id, exp, nonce, sig, ...},
 * tiền tố SMARTBUS-QR- hoặc mã vé thô (ticket_code / ticket id).
 * Các trường bảo mật (exp/nonce/sig) chỉ trích khi có mặt trong payload —
 * QR cũ dạng SMARTBUS-QR-{code} vẫn hoạt động như trước.
 */
export function parseQrScan(rawCode: string): ParsedQrScan {
  const trimmed = (rawCode || '').trim().replace(/^SMARTBUS-QR-/, '');
  if (!trimmed) throw new TicketValidationError(400, 'Vui lòng cung cấp mã vé.');
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      const code = typeof parsed.ticket_code === 'string' ? parsed.ticket_code.trim() : '';
      if (code) {
        const result: ParsedQrScan = {
          code,
          embeddedTripId: typeof parsed.trip_id === 'string' ? parsed.trip_id.trim() : undefined,
        };
        if (typeof parsed.exp === 'number' && Number.isFinite(parsed.exp)) {
          result.exp = Math.trunc(parsed.exp);
        }
        if (typeof parsed.nonce === 'string' && parsed.nonce.trim()) {
          result.nonce = parsed.nonce.trim();
        }
        if (typeof parsed.sig === 'string' && parsed.sig.trim()) {
          result.sig = parsed.sig.trim();
        }
        return result;
      }
    } catch {
      // Không phải JSON hợp lệ — coi như mã thô.
    }
  }
  return { code: trimmed };
}

/** SHA-256 của chuỗi QR gốc — lưu vào log kiểm toán, không lưu mã QR thô. */
export function hashQrScan(rawCode: string): string {
  return createHash('sha256')
    .update((rawCode || '').trim())
    .digest('hex');
}

function finiteOrNull(value?: number): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

async function writeRejectionLog(
  error: RejectedTicketError,
  input: ValidateTicketQrInput,
  stopId: string | undefined,
  qrCodeHash: string
): Promise<void> {
  try {
    await query(
      `INSERT INTO ticket_validation_logs
         (ticket_id, trip_id, validated_by, stop_id, result, reason, latitude, longitude, qr_code_hash)
       VALUES ($1,$2,$3,$4,'REJECTED',$5,$6,$7,$8)`,
      [
        error.ticketId,
        error.tripId,
        input.validatedBy ?? null,
        stopId ?? null,
        error.reason,
        finiteOrNull(input.latitude),
        finiteOrNull(input.longitude),
        qrCodeHash,
      ]
    );
  } catch (logError) {
    logger.error('validation_log_write_failed', {
      ticket_id: error.ticketId,
      reason: error.reason,
      error: logError,
    });
  }
}

/**
 * Soát vé QR (Sprint 3):
 *  1. Parse mã QR (JSON / tiền tố SMARTBUS-QR- / mã thô), trích exp/nonce/sig.
 *  2. Khóa phân tán `lock:ticket:scan:{code}` (TTL 5s) để hai thiết bị không
 *     thể soát cùng lúc; không có Redis thì khóa hàng PostgreSQL
 *     (SELECT ... FOR UPDATE) vẫn là chốt chặn.
 *  3. Trong transaction (BEGIN/COMMIT/ROLLBACK):
 *     a. Chữ ký HMAC-SHA256 (nếu payload có sig) → sai là 403 REJECTED.
 *     b. Hết hạn QR (nếu payload có exp) → quá hạn là 403 REJECTED.
 *     c. Redis anti-replay nonce (nếu payload có nonce) → quét lại trong
 *        QR_NONCE_TTL_SECONDS là 409 REJECTED.
 *     d. Kiểm tra vé thuộc chuyến hiện tại, BOOKED → CHECKED_IN,
 *        CHECKED_IN → isAlreadyCheckedIn=true, RESERVED/CANCELLED → 409
 *        (ghi log REJECTED sau khi rollback).
 */
export async function validateTicketQr(
  input: ValidateTicketQrInput
): Promise<ValidateTicketQrResult> {
  const { code, embeddedTripId, exp, nonce, sig } = parseQrScan(input.code ?? '');
  const expectedTripId = (input.tripId ?? embeddedTripId ?? '').trim() || undefined;
  const qrCodeHash = hashQrScan(input.code);
  const stopId = input.stopId?.trim() || undefined;
  if (stopId) {
    const [stop] = await query<Array<{ id: string }>>('SELECT id FROM bus_stops WHERE id=$1', [
      stopId,
    ]);
    if (!stop) throw new TicketValidationError(400, 'Trạm dừng không tồn tại.');
  }

  const ownerId = input.validatedBy || 'anonymous';
  const lockId = await acquireTicketValidationLock(code, ownerId, 5);
  if (lockId === null) {
    throw new TicketValidationError(
      409,
      'Một thiết bị khác đang soát vé này. Vui lòng thử lại sau.'
    );
  }

  try {
    return await transaction(async client => {
      const {
        rows: [ticket],
      } = await client.query<any>(
        `SELECT t.*,u.full_name,u.email,r.name AS route_name,r.code AS route_code
         FROM tickets t LEFT JOIN users u ON u.id=t.user_id
         JOIN trips tr ON tr.id=t.trip_id JOIN routes r ON r.id=tr.route_id
         WHERE t.ticket_code=$1 OR t.id=$1
         FOR UPDATE OF t`,
        [code]
      );
      if (!ticket) throw new TicketValidationError(404, 'Không tìm thấy vé.');

      // --- Bảo mật QR (Sprint 3) — chạy trước mọi ràng buộc nghiệp vụ ---
      // a) Chữ ký HMAC-SHA256: payload ký phải khớp ticket thực trong DB.
      if (sig) {
        const expected = computeQrSignature({
          ticket_code: ticket.ticket_code,
          trip_id: ticket.trip_id,
          seat_number: ticket.seat_number ?? null,
          exp,
          nonce,
        });
        if (!expected || !hexesEqualHex(expected, sig)) {
          throw new RejectedTicketError(
            403,
            'Chữ ký QR không hợp lệ.',
            'QR_SIGNATURE_MISMATCH',
            ticket.id,
            ticket.trip_id
          );
        }
      }
      // b) Hết hạn QR.
      if (exp !== undefined) {
        if (!Number.isFinite(exp) || exp <= 0 || exp * 1000 < Date.now()) {
          throw new RejectedTicketError(
            403,
            'Mã QR đã hết hạn.',
            'QR_EXPIRED',
            ticket.id,
            ticket.trip_id
          );
        }
      }
      // c) Redis anti-replay nonce (SET NX EX; fallback process-local khi
      //    không có Redis) — cùng nonce quét lần 2 trong TTL là replay.
      if (nonce) {
        const firstScan = await setIfAbsent(`qr:nonce:${nonce}`, '1', QR_NONCE_TTL_SECONDS);
        if (!firstScan) {
          throw new RejectedTicketError(
            409,
            'Mã QR này vừa được quét — nghi ngờ replay.',
            'QR_REPLAY',
            ticket.id,
            ticket.trip_id
          );
        }
      }

      if (expectedTripId && ticket.trip_id !== expectedTripId) {
        throw new RejectedTicketError(
          403,
          'Vé không thuộc chuyến xe hiện tại.',
          'TRIP_MISMATCH',
          ticket.id,
          ticket.trip_id
        );
      }

      let outcome: 'VALID' | 'ALREADY_USED';
      if (ticket.status === 'BOOKED') {
        await client.query("UPDATE tickets SET status='CHECKED_IN' WHERE id=$1", [ticket.id]);
        await client.query("UPDATE trip_seats SET status='CHECKED_IN' WHERE ticket_id=$1", [
          ticket.id,
        ]);
        outcome = 'VALID';
      } else if (ticket.status === 'CHECKED_IN') {
        outcome = 'ALREADY_USED';
      } else {
        const reason =
          ticket.status === 'RESERVED'
            ? 'Vé chưa được thanh toán.'
            : ticket.status === 'CANCELLED'
              ? 'Vé đã bị hủy.'
              : 'Vé không còn hiệu lực.';
        throw new RejectedTicketError(409, reason, ticket.status, ticket.id, ticket.trip_id);
      }

      const {
        rows: [logRow],
      } = await client.query<any>(
        `INSERT INTO ticket_validation_logs
           (ticket_id, trip_id, validated_by, stop_id, result, reason, latitude, longitude, qr_code_hash)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
        [
          ticket.id,
          ticket.trip_id,
          input.validatedBy ?? null,
          stopId ?? null,
          outcome,
          outcome === 'ALREADY_USED' ? 'Đã soát vé trước đó.' : null,
          finiteOrNull(input.latitude),
          finiteOrNull(input.longitude),
          qrCodeHash,
        ]
      );
      logger.info('ticket_validated', {
        ticket_id: ticket.id,
        trip_id: ticket.trip_id,
        result: outcome,
        validated_by: input.validatedBy,
      });
      return {
        isAlreadyCheckedIn: outcome === 'ALREADY_USED',
        validationId: logRow?.id ?? null,
        qrCodeHash,
        ticket: {
          id: ticket.id,
          ticketCode: ticket.ticket_code,
          seatNumber: ticket.seat_number,
          fareAmount: Number(ticket.fare_amount),
          status: 'CHECKED_IN' as const,
          user: { fullName: ticket.full_name, email: ticket.email },
          trip: { route: { name: ticket.route_name, code: ticket.route_code } },
        },
      };
    });
  } catch (error) {
    if (error instanceof RejectedTicketError) {
      // Transaction đã rollback — ghi log REJECTED bằng câu lệnh riêng.
      await writeRejectionLog(error, input, stopId, qrCodeHash);
    }
    throw error;
  } finally {
    await releaseTicketValidationLock(code, lockId);
  }
}

import { createHash, randomBytes } from 'crypto';
import { PoolClient } from 'pg';
import { query, transaction } from '../config/database';
import { readEnv } from '../config/env';
import { sendEmail } from './email.service';

const fail = (message: string, status = 400): never => {
  throw Object.assign(new Error(message), { status });
};
export const validEmail = (email: unknown): email is string =>
  typeof email === 'string' &&
  email.length <= 254 &&
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/.test(
    email.trim()
  );

export function frontendUrl(path: string): URL {
  const configured =
    readEnv('FRONTEND_PUBLIC_URL') ||
    (readEnv('VERCEL_URL') ? 'https://' + readEnv('VERCEL_URL') : 'http://localhost:3000');
  const origin = new URL(configured);
  if (
    !['http:', 'https:'].includes(origin.protocol) ||
    origin.username ||
    origin.password ||
    (process.env.NODE_ENV === 'production' && origin.protocol !== 'https:')
  )
    throw new Error('FRONTEND_PUBLIC_URL không hợp lệ.');
  return new URL(path, origin.origin);
}

export async function assertEmailVerified(userId: string, client?: PoolClient): Promise<void> {
  const sql = 'SELECT email_verified_at FROM users WHERE id=$1';
  const [user] = client
    ? (await client.query(sql, [userId])).rows
    : await query<any[]>(sql, [userId]);
  if (!user?.email_verified_at)
    fail('Vui lòng xác minh email trong tài khoản trước khi đặt vé.', 403);
}

export async function sendVerificationEmail(
  userId: string
): Promise<{ emailSent: boolean; emailVerified: boolean; message: string }> {
  const token = randomBytes(32).toString('hex');
  const link = frontendUrl('/verify-email');
  // Fragment does not reach HTTP access logs or referrer headers.
  link.hash = new URLSearchParams({ token }).toString();
  const user = await transaction(async client => {
    const {
      rows: [u],
    } = await client.query('SELECT * FROM users WHERE id=$1 FOR UPDATE', [userId]);
    if (!u || u.status !== 'ACTIVE') fail('Tài khoản không hoạt động.', 403);
    if (u.email_verified_at) return null;
    if (u.verification_sent_at && Date.now() - Date.parse(u.verification_sent_at) < 60_000)
      fail('Vui lòng chờ 60 giây trước khi gửi lại email xác minh.', 429);
    const sameWindow =
      u.verification_window_started_at &&
      Date.now() - Date.parse(u.verification_window_started_at) < 3600_000;
    if (sameWindow && u.verification_send_count >= 5)
      fail('Đã đạt giới hạn 5 email xác minh mỗi giờ. Vui lòng thử lại sau.', 429);
    await client.query(
      `UPDATE users SET verification_token_hash=$2,verification_expires_at=NOW()+INTERVAL '30 minutes',
      verification_sent_at=NOW(),verification_window_started_at=CASE WHEN $3 THEN verification_window_started_at ELSE NOW() END,
      verification_send_count=CASE WHEN $3 THEN verification_send_count+1 ELSE 1 END WHERE id=$1`,
      [userId, createHash('sha256').update(token).digest('hex'), !!sameWindow]
    );
    return u;
  });
  if (!user) return { emailSent: false, emailVerified: true, message: 'Email đã được xác minh.' };
  const emailSent = await sendEmail(
    user.email,
    '[SmartBus] Xác minh email của bạn',
    `Xin chào ${user.full_name},\nMở liên kết và bấm Xác minh email để xác nhận bạn sở hữu hộp thư này:\n${link.href}\nLiên kết có hiệu lực 30 phút và chỉ dùng một lần. Nếu không tạo tài khoản SmartBus, hãy bỏ qua email này.`
  );
  return {
    emailSent,
    emailVerified: false,
    message: emailSent
      ? 'Đã gửi liên kết xác minh. Kiểm tra hộp thư và thư rác; liên kết có hiệu lực 30 phút.'
      : 'Tài khoản đã tạo nhưng chưa gửi được email xác minh. Vui lòng gửi lại hoặc liên hệ nhà xe.',
  };
}

export async function verifyEmail(token: unknown): Promise<{ email: string; message: string }> {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token))
    fail('Liên kết xác minh không hợp lệ.');
  const [user] = await query<any[]>(
    `UPDATE users SET email_verified_at=NOW(),verification_token_hash=NULL,verification_expires_at=NULL
    WHERE verification_token_hash=$1 AND verification_expires_at>NOW() AND status='ACTIVE' RETURNING email`,
    [
      createHash('sha256')
        .update(token as string)
        .digest('hex'),
    ]
  );
  if (!user)
    fail('Liên kết đã hết hạn, đã dùng hoặc được thay bằng liên kết mới. Vui lòng gửi lại.');
  return {
    email: user.email,
    message: 'Email đã được xác minh. Bạn có thể đặt vé và nhận vé qua email.',
  };
}

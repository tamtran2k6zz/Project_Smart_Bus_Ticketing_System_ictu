import { createHash, randomBytes } from 'crypto';
import bcrypt from 'bcrypt';
import { transaction, query } from '../config/database';
import { collectEmailEnvironmentIssues } from '../config/env';
import { localDemoEnabled } from '../config/demo';
import { frontendUrl, validEmail } from './email-verification.service';
import { sendEmail } from './email.service';
import { appLogger } from '../config/logger';
import { disconnectUserSockets } from './websocket.service';

const fail = (message: string, status = 400): never => {
  throw Object.assign(new Error(message), { status });
};
const digest = (token: string) => createHash('sha256').update(token).digest('hex');
const accepted = {
  message:
    'Nếu email thuộc tài khoản đang hoạt động, hãy kiểm tra hộp thư và thư rác để đặt lại mật khẩu. Chờ ít nhất 60 giây trước khi yêu cầu lại. Nếu vẫn chưa nhận được thư, vui lòng thử lại sau hoặc liên hệ nhà xe.',
};

export async function requestPasswordReset(email: unknown) {
  if (!validEmail(email)) fail('Nhập địa chỉ email hợp lệ.');
  if (!localDemoEnabled() && collectEmailEnvironmentIssues().length)
    fail('Dịch vụ gửi email chưa được cấu hình đầy đủ. Vui lòng liên hệ nhà xe.', 503);
  const token = randomBytes(32).toString('hex');
  let link: URL;
  try {
    link = frontendUrl('/reset-password');
  } catch {
    return fail(
      'Chưa cấu hình đúng địa chỉ nhận liên kết khôi phục. Vui lòng liên hệ nhà xe.',
      503
    );
  }
  link.hash = new URLSearchParams({ token }).toString();
  const hash = digest(token);
  const user = await transaction(async client => {
    const {
      rows: [u],
    } = await client.query(
      "SELECT * FROM users WHERE LOWER(email)=$1 AND status='ACTIVE' FOR UPDATE",
      [(email as string).trim().toLowerCase()]
    );
    if (!u) return null;
    if (
      u.password_reset_sent_at &&
      Date.now() - new Date(u.password_reset_sent_at).getTime() < 60000
    )
      return null;
    const sameWindow =
      u.password_reset_window_started_at &&
      Date.now() - new Date(u.password_reset_window_started_at).getTime() < 3600000;
    if (sameWindow && u.password_reset_send_count >= 5) return null;
    await client.query(
      `UPDATE users SET password_reset_token_hash=$2,password_reset_expires_at=NOW()+INTERVAL '30 minutes',
      password_reset_sent_at=NOW(),password_reset_window_started_at=CASE WHEN $3 THEN password_reset_window_started_at ELSE NOW() END,
      password_reset_send_count=CASE WHEN $3 THEN password_reset_send_count+1 ELSE 1 END WHERE id=$1`,
      [u.id, hash, !!sameWindow]
    );
    return u;
  });
  // Same public response for unknown/locked accounts and account throttling.
  if (!user) return accepted;
  let delivered = false;
  try {
    delivered = await sendEmail(
      user.email,
      '[SmartBus] Đặt lại mật khẩu',
      `Xin chào ${user.full_name},\nBạn đã yêu cầu đặt lại mật khẩu SmartBus. Mở liên kết sau và nhập mật khẩu mới:\n${link.href}\nLiên kết có hiệu lực 30 phút, chỉ dùng một lần. Yêu cầu mới sẽ thay thế liên kết cũ. Nếu không yêu cầu, hãy bỏ qua email; mật khẩu hiện tại vẫn giữ nguyên. SmartBus không gửi mật khẩu qua email.`
    );
  } catch {
    appLogger.error('password_reset_delivery_failed', { user_id: user.id });
  }
  if (!delivered) {
    await query(
      'UPDATE users SET password_reset_token_hash=NULL,password_reset_expires_at=NULL WHERE id=$1 AND password_reset_token_hash=$2',
      [user.id, hash]
    );
    appLogger.error('password_reset_not_delivered', { user_id: user.id });
  }
  // SMTP rejection must not disclose whether an address is registered.
  return accepted;
}

export async function resetPassword(token: unknown, password: unknown) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token))
    fail('Liên kết đặt lại mật khẩu không hợp lệ.');
  if (
    typeof password !== 'string' ||
    password.length < 8 ||
    Buffer.byteLength(password, 'utf8') > 72
  )
    fail('Mật khẩu cần ít nhất 8 ký tự và tối đa 72 byte UTF-8.');
  const userId = await transaction(async client => {
    const {
      rows: [user],
    } = await client.query(
      "SELECT id FROM users WHERE password_reset_token_hash=$1 AND password_reset_expires_at>NOW() AND status='ACTIVE' FOR UPDATE",
      [digest(token as string)]
    );
    if (!user)
      fail('Liên kết đã hết hạn, đã dùng hoặc được thay thế. Vui lòng yêu cầu liên kết mới.');
    const hash = await bcrypt.hash(password as string, 10);
    await client.query(
      `UPDATE users SET password_hash=$2,password_reset_token_hash=NULL,password_reset_expires_at=NULL,
      auth_version=auth_version+1,email_verified_at=COALESCE(email_verified_at,NOW()),
      verification_token_hash=NULL,verification_expires_at=NULL,updated_at=NOW() WHERE id=$1`,
      [user.id, hash]
    );
    return user.id as string;
  });
  disconnectUserSockets(userId);
  return { message: 'Đã đặt lại mật khẩu. Vui lòng đăng nhập bằng mật khẩu mới.' };
}

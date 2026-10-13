import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Field, Message } from '@/components/ui/Ui';
import { clearAccessToken } from '@/services/http';
import { useSession } from '@/store/session.store';
import { errorText } from '@/utils/format';
import { authApi } from '../services/auth.api';

export default function ResetPassword() {
  const location = useLocation(),
    navigate = useNavigate(),
    client = useQueryClient();
  const [token, setToken] = useState(
    () => new URLSearchParams(location.hash.slice(1)).get('token') || ''
  );
  const [password, setPassword] = useState(''),
    [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState('');
  useEffect(() => {
    const incoming = new URLSearchParams(location.hash.slice(1)).get('token');
    if (incoming) {
      setToken(incoming);
      navigate('/reset-password', { replace: true });
    }
  }, [location.hash, navigate]);
  return (
    <div>
      <h1>Đặt lại mật khẩu</h1>
      <p>
        Nhập mật khẩu mới cho tài khoản SmartBus. Liên kết có hiệu lực 30 phút và chỉ dùng một lần.
      </p>
      <Message error>{error}</Message>
      <Message>{message}</Message>
      {!token && !message && (
        <Message error>Liên kết thiếu mã khôi phục. Vui lòng yêu cầu email mới.</Message>
      )}
      {token && !message && (
        <form
          className="stack"
          onSubmit={async e => {
            e.preventDefault();
            setError('');
            if (password.length < 8 || new TextEncoder().encode(password).length > 72) {
              setError('Mật khẩu cần ít nhất 8 ký tự và tối đa 72 byte UTF-8.');
              return;
            }
            if (password !== confirm) {
              setError('Hai mật khẩu không khớp.');
              return;
            }
            setBusy(true);
            try {
              const result = await authApi.resetPassword(token, password);
              clearAccessToken();
              useSession.getState().setUser(null);
              client.clear();
              setToken('');
              setPassword('');
              setConfirm('');
              setMessage(result.message);
            } catch (e) {
              setError(errorText(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field label="Mật khẩu mới">
            <input
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              disabled={busy}
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </Field>
          <Field label="Nhập lại mật khẩu mới">
            <input
              type="password"
              autoComplete="new-password"
              required
              disabled={busy}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
            />
          </Field>
          <Button disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu mật khẩu mới'}</Button>
        </form>
      )}
      <div className="stack" style={{ marginTop: 20 }}>
        <Link to="/login">Đăng nhập</Link>
        <Link to="/forgot-password">Yêu cầu liên kết mới</Link>
      </div>
    </div>
  );
}

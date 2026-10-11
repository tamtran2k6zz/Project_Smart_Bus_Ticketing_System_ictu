import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/store/session.store';
import { Button, Message } from '@/components/ui/Ui';
import { errorText } from '@/utils/format';
import { appConfig } from '@/configs/app.config';
import { authApi } from '../services/auth.api';

export default function VerifyEmail() {
  const location = useLocation(),
    navigate = useNavigate(),
    client = useQueryClient();
  const { user, setUser } = useSession();
  const [token, setToken] = useState(
    () => new URLSearchParams(location.hash.slice(1)).get('token') || ''
  );
  const [message, setMessage] = useState<string>(
    location.state?.notice || 'Mở email SmartBus và bấm liên kết xác minh. Kiểm tra cả thư rác.'
  );
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [verified, setVerified] = useState(false);
  useEffect(() => {
    const incoming = new URLSearchParams(location.hash.slice(1)).get('token');
    if (incoming) {
      setToken(incoming);
      setVerified(false);
      navigate('/verify-email', { replace: true });
    }
  }, [location.hash, navigate]);
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  const refresh = async () => {
    if (!user) return;
    const current = await authApi.session(user.id);
    setUser(current);
    await client.invalidateQueries({ queryKey: ['session'] });
    if (current.emailVerified) navigate('/account/tickets', { replace: true });
    else setMessage('Email chưa được xác minh. Hãy mở liên kết trong email và bấm Xác minh email.');
  };
  return (
    <div>
      <h1>Xác minh email</h1>
      <p>
        {user?.email
          ? `Tài khoản: ${user.email}`
          : 'Xác nhận hộp thư bạn sử dụng để tạo tài khoản SmartBus.'}
      </p>
      <p>
        Cần xác minh email trước khi đặt vé. Vé QR sẽ được gửi đến email đã xác minh sau khi thanh
        toán thành công.
      </p>
      <Message>{message}</Message>
      <Message error>{error}</Message>
      <div className="stack">
        {token && !verified && (
          <Button
            disabled={busy || appConfig.demo}
            onClick={() =>
              run(async () => {
                const result = await authApi.verifyEmail(token);
                setMessage(`${result.message} (${result.email})`);
                setVerified(true);
                if (user) {
                  setUser(await authApi.session(user.id));
                  await client.invalidateQueries({ queryKey: ['session'] });
                }
              })
            }
          >
            Xác minh email
          </Button>
        )}
        {user && !user.emailVerified && (
          <>
            <Button
              variant="secondary"
              disabled={busy || appConfig.demo}
              onClick={() =>
                run(async () => {
                  const result = await authApi.resendVerification();
                  setMessage(result.message);
                })
              }
            >
              Gửi lại email xác minh
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => run(refresh)}>
              Tôi đã xác minh, kiểm tra lại
            </Button>
            <p className="muted">
              Liên kết có hiệu lực 30 phút. Chờ ít nhất 60 giây giữa hai lần gửi; tối đa 5 lần mỗi
              giờ.
            </p>
          </>
        )}
        <Link to={user ? '/account/profile' : '/login'}>
          {user ? 'Về hồ sơ tài khoản' : 'Đăng nhập'}
        </Link>
        {user?.emailVerified && <Link to="/trips">Tìm chuyến và đặt vé</Link>}
      </div>
    </div>
  );
}

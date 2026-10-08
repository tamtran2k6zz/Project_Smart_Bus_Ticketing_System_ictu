import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { appConfig } from '@/configs/app.config';
import { useSession } from '@/store/session.store';
import { authApi } from '../services/auth.api';
import { roleLabels } from '@/configs/permissions';
import { Button, Field, Message } from '@/components/ui/Ui';
import { errorText } from '@/utils/format';
import type { Role, User } from '../types';
const schema = z.object({
  email: z.email('Email không hợp lệ'),
  password: z.string(),
  name: z.string(),
  phone: z.string(),
});
export function AuthForm({ mode }: { mode: 'login' | 'register' | 'forgot' }) {
  const navigate = useNavigate(),
    [params] = useSearchParams(),
    client = useQueryClient();
  const setUser = useSession(s => s.setUser);
  const [error, setError] = useState(''),
    [success, setSuccess] = useState(''),
    [busy, setBusy] = useState(false);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', name: '', phone: '' },
  });
  const finish = (user: User) => {
    setUser(user);
    client.clear();
    const redirect = params.get('redirect');
    let target =
      user.role === 'DRIVER'
        ? '/staff/trips'
        : ['ADMIN', 'MANAGER', 'FINANCE'].includes(user.role)
          ? '/admin'
          : '/account/tickets';
    if (redirect?.startsWith('/')) {
      const url = new URL(redirect, window.location.origin);
      if (url.origin === window.location.origin) target = url.pathname + url.search + url.hash;
    }
    navigate(target, { replace: true });
  };
  const run = async (action: () => Promise<User | void>) => {
    setBusy(true);
    setError('');
    try {
      const user = await action();
      if (user) finish(user);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      <span className="muted">CHÀO MỪNG ĐẾN SMARTBUS</span>
      <h1>
        {mode === 'login'
          ? 'Đăng nhập tài khoản'
          : mode === 'register'
            ? 'Tạo tài khoản của bạn'
            : 'Khôi phục mật khẩu'}
      </h1>
      <p>
        {mode === 'forgot'
          ? 'Nhập email để gửi yêu cầu khôi phục.'
          : 'Quản lý vé và hành trình của bạn trong một nơi.'}
      </p>
      <form
        className="stack"
        onSubmit={form.handleSubmit(v =>
          run(async () => {
            if (mode === 'forgot') {
              const result = await authApi.forgot(v.email);
              setSuccess(result.message);
              return;
            }
            if (v.password.length < 8) {
              form.setError('password', { message: 'Mật khẩu ít nhất 8 ký tự' });
              return;
            }
            if (mode === 'register') {
              if (v.name.trim().length < 2) {
                form.setError('name', { message: 'Họ tên ít nhất 2 ký tự' });
                return;
              }
              if (!/^(0|\+84)\d{9}$/.test(v.phone)) {
                form.setError('phone', { message: 'Số điện thoại không hợp lệ' });
                return;
              }
              return authApi.register(v.name, v.email, v.phone, v.password);
            }
            return authApi.login(v.email, v.password);
          })
        )}
      >
        {mode === 'register' && (
          <>
            <Field label="Họ tên" error={form.formState.errors.name?.message}>
              <input autoComplete="name" {...form.register('name')} />
            </Field>
            <Field label="Số điện thoại" error={form.formState.errors.phone?.message}>
              <input autoComplete="tel" {...form.register('phone')} />
            </Field>
          </>
        )}
        <Field label="Email" error={form.formState.errors.email?.message}>
          <input type="email" autoComplete="email" {...form.register('email')} />
        </Field>
        {mode !== 'forgot' && (
          <Field label="Mật khẩu" error={form.formState.errors.password?.message}>
            <input
              type="password"
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              {...form.register('password')}
            />
          </Field>
        )}
        <Message error>{error}</Message>
        <Message>{success}</Message>
        <Button disabled={busy}>
          {busy
            ? 'Đang xử lý…'
            : mode === 'login'
              ? 'Đăng nhập'
              : mode === 'register'
                ? 'Đăng ký'
                : 'Gửi yêu cầu'}
        </Button>
      </form>
      <div className="between" style={{ margin: '20px 0', fontSize: 12 }}>
        <Link to={mode === 'login' ? '/register' : '/login'}>
          {mode === 'login' ? 'Tạo tài khoản mới' : 'Trở về đăng nhập'}
        </Link>
        {mode === 'login' && <Link to="/forgot-password">Quên mật khẩu?</Link>}
      </div>
      {appConfig.demo && mode === 'login' && (
        <>
          <hr className="divider" />
          <p>Trải nghiệm demo theo vai trò</p>
          <div className="grid">
            {(['PASSENGER', 'DRIVER', 'MANAGER', 'FINANCE', 'ADMIN'] as Role[]).map(role => (
              <Button
                key={role}
                variant="secondary"
                disabled={busy}
                onClick={() => run(() => authApi.demoLogin(role))}
              >
                {roleLabels[role]}
              </Button>
            ))}
          </div>
          <p>
            Email mẫu: passenger@smartbus.demo
            <br />
            Mật khẩu: SmartBus123!
          </p>
        </>
      )}
    </div>
  );
}

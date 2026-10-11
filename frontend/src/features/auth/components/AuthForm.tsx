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
import type { User } from '../types';
import { apiTestAccounts, demoTestAccounts } from '../testAccounts';
import s from './AuthForm.module.css';
const schema = z.object({
  email: z.string().trim(),
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
    resolver: zodResolver(
      schema.extend({
        email:
          mode === 'login'
            ? z
                .string()
                .trim()
                .refine(
                  value => z.email().safeParse(value).success || /^(0|\+84)\d{9}$/.test(value),
                  'Nhập email hoặc số điện thoại hợp lệ'
                )
            : z.email('Email không hợp lệ').trim(),
      })
    ),
    defaultValues: { email: '', password: '', name: '', phone: '' },
  });
  const testAccounts = appConfig.demo ? demoTestAccounts : apiTestAccounts;
  const finish = (user: User) => {
    setUser(user);
    client.clear();
    if (!appConfig.demo && user.role === 'PASSENGER' && !user.emailVerified) {
      navigate('/verify-email', { replace: true, state: { notice: user.emailVerificationNotice } });
      return;
    }
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
          ? appConfig.demo
            ? 'Nhập email để gửi yêu cầu khôi phục.'
            : 'Khôi phục mật khẩu trực tuyến chưa mở. Vui lòng liên hệ nhà xe để được hỗ trợ tài khoản.'
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
        <Field
          label={mode === 'login' ? 'Email hoặc số điện thoại' : 'Email'}
          error={form.formState.errors.email?.message}
        >
          <input
            type={mode === 'login' ? 'text' : 'email'}
            autoComplete={mode === 'login' ? 'username' : 'email'}
            placeholder={mode === 'login' ? 'Nhập email hoặc số điện thoại' : undefined}
            disabled={busy}
            {...form.register('email')}
          />
        </Field>
        {mode !== 'forgot' && (
          <Field label="Mật khẩu" error={form.formState.errors.password?.message}>
            <input
              type="password"
              disabled={busy}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              {...form.register('password')}
            />
          </Field>
        )}
        <Message error>{error}</Message>
        <Message>{success}</Message>
        <Button disabled={busy || (mode === 'forgot' && !appConfig.demo)}>
          {busy
            ? 'Đang xử lý…'
            : mode === 'login'
              ? 'Đăng nhập'
              : mode === 'register'
                ? 'Đăng ký & xác minh email'
                : 'Gửi yêu cầu'}
        </Button>
      </form>
      <div className="between" style={{ margin: '20px 0', fontSize: 12 }}>
        <Link to={mode === 'login' ? '/register' : '/login'}>
          {mode === 'login' ? 'Tạo tài khoản mới' : 'Trở về đăng nhập'}
        </Link>
        {mode === 'login' && <Link to="/forgot-password">Quên mật khẩu?</Link>}
      </div>
      {(appConfig.demo || appConfig.quickLogin) && mode === 'login' && (
        <section className={s.quickLogin} aria-labelledby="quick-login-title">
          <hr className="divider" />
          <h2 id="quick-login-title">Đăng nhập nhanh để test</h2>
          <p>Chọn tài khoản mẫu để đăng nhập bằng số điện thoại.</p>
          <div className={s.accounts}>
            {testAccounts.map(account => (
              <Button
                key={account.role}
                type="button"
                className={s.account}
                variant="secondary"
                disabled={busy}
                onClick={() => {
                  form.clearErrors();
                  form.setValue('email', account.phone);
                  form.setValue('password', account.password);
                  void run(() => authApi.login(account.phone, account.password));
                }}
              >
                <strong>{roleLabels[account.role]}</strong>
                <span>{account.phone}</span>
                <small>{account.email}</small>
              </Button>
            ))}
          </div>
          {appConfig.demo && <p>Mật khẩu demo: SmartBus123!</p>}
        </section>
      )}
    </div>
  );
}

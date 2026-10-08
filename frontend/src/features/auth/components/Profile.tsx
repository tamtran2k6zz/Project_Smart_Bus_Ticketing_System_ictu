import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSession } from '@/store/session.store';
import { useAction } from '@/hooks/useAction';
import { authApi } from '../services/auth.api';
import { PageTitle, Card, Field, Button, ActionMessage, Badge } from '@/components/ui/Ui';
import { roleLabels } from '@/configs/permissions';
const schema = z.object({
  name: z.string().trim().min(2, 'Họ tên ít nhất 2 ký tự'),
  phone: z.string().regex(/^(0|\+84)\d{9}$/, 'Số điện thoại không hợp lệ'),
});
export function Profile() {
  const { user, setUser } = useSession();
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: user?.name, phone: user?.phone },
  });
  const action = useAction(
    async (v: z.infer<typeof schema>) => setUser(await authApi.profile(user!.id, v.name, v.phone)),
    'Đã cập nhật hồ sơ.'
  );
  return (
    <>
      <PageTitle
        title="Hồ sơ tài khoản"
        description="Cập nhật thông tin liên hệ dùng trong đặt vé."
      />
      <Card>
        <Badge>{roleLabels[user!.role]}</Badge>
        <p className="muted">{user?.email}</p>
        <form
          className="stack"
          style={{ maxWidth: 550 }}
          onSubmit={form.handleSubmit(v => action.mutate(v))}
        >
          <Field label="Họ tên" error={form.formState.errors.name?.message}>
            <input {...form.register('name')} />
          </Field>
          <Field label="Số điện thoại" error={form.formState.errors.phone?.message}>
            <input {...form.register('phone')} />
          </Field>
          <ActionMessage action={action} />
          <Button disabled={action.isPending}>Lưu thông tin</Button>
        </form>
      </Card>
    </>
  );
}

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CreditCard } from 'lucide-react';
import { useSession } from '@/store/session.store';
import { useAction } from '@/hooks/useAction';
import { passesApi } from '../services/passes.api';
import { operationsApi } from '@/features/operations/services/operations.api';
import {
  PageTitle,
  Card,
  Badge,
  Field,
  Button,
  AsyncState,
  ActionMessage,
  Modal,
} from '@/components/ui/Ui';
import { money, dateTime } from '@/utils/format';
import { appConfig } from '@/configs/app.config';
const schema = z.object({
  category: z.string().min(1),
  document: z.string().min(5, 'Nhập mã giấy tờ ít nhất 5 ký tự'),
});
export function Passes() {
  const user = useSession(s => s.user)!;
  const query = useQuery({ queryKey: ['passes', user.id], queryFn: () => passesApi.list(user.id) });
  const catalog = useQuery({ queryKey: ['catalog'], queryFn: operationsApi.catalog });
  const [route, setRoute] = useState(''),
    [confirm, setConfirm] = useState<{ routeId: string; id?: string } | null>(null);
  const buy = useAction(async () => {
    if (!confirm) throw new Error('Chọn tuyến.');
    await passesApi.buy(user.id, confirm.routeId, confirm.id);
    setConfirm(null);
  }, 'Vé tháng đã được cập nhật.');
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { category: 'Sinh viên', document: '' },
  });
  const eligibility = useAction(async (v: z.infer<typeof schema>) => {
    await passesApi.eligibility(user.id, v.category, v.document);
    form.reset();
  }, 'Hồ sơ đã được gửi để duyệt.');
  return (
    <>
      <PageTitle
        eyebrow="ĐI LẠI THƯỜNG XUYÊN"
        title="Vé tháng & ưu đãi"
        description="Quản lý tuyến quen thuộc và thời hạn sử dụng. Giá dưới đây là chính sách demo."
      />
      <div className="grid">
        <div className="stack">
          <Card>
            <div className="row">
              <CreditCard color="#15803d" />
              <h3>Đăng ký vé tháng</h3>
            </div>
            <p className="muted">
              Demo: {money(250000)} / 30 ngày. Hồ sơ được duyệt: {money(150000)}. Không thu tiền
              thật.
            </p>
            <Field label="Tuyến đăng ký">
              <select value={route} onChange={e => setRoute(e.target.value)}>
                <option value="">Chọn tuyến</option>
                {catalog.data?.routes
                  .filter(r => r.active)
                  .map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Button
              style={{ marginTop: 18 }}
              disabled={!route}
              onClick={() => setConfirm({ routeId: route })}
            >
              Đăng ký {appConfig.demo ? 'demo' : ''}
            </Button>
            <ActionMessage action={buy} />
          </Card>
          <AsyncState
            query={query}
            empty={query.data?.passes.length === 0}
            emptyText="Chưa đăng ký vé tháng"
          >
            {query.data?.passes.map(p => (
              <Card key={p.id}>
                <Badge tone={Date.parse(p.expiresAt) > Date.now() ? 'green' : 'amber'}>
                  {Date.parse(p.expiresAt) > Date.now() ? 'Đang hoạt động' : 'Hết hạn'}
                </Badge>
                <h3>{catalog.data?.routes.find(r => r.id === p.routeId)?.name}</h3>
                <p className="muted">
                  Hạn dùng: {dateTime(p.expiresAt)}
                  <br />
                  Giá lần gần nhất: {money(p.price)}
                </p>
                <Button
                  variant="secondary"
                  onClick={() => setConfirm({ routeId: p.routeId, id: p.id })}
                >
                  Gia hạn thêm 30 ngày
                </Button>
              </Card>
            ))}
          </AsyncState>
        </div>
        <Card>
          <h3>Hồ sơ đối tượng ưu đãi</h3>
          <p className="muted">
            Gửi thông tin để điều hành duyệt. Trong demo chỉ nhập dữ liệu giả.
          </p>
          <form className="stack" onSubmit={form.handleSubmit(v => eligibility.mutate(v))}>
            <Field label="Nhóm đối tượng">
              <select {...form.register('category')}>
                <option>Sinh viên</option>
                <option>Người cao tuổi</option>
                <option>Người khuyết tật</option>
              </select>
            </Field>
            <Field label="Mã giấy tờ demo" error={form.formState.errors.document?.message}>
              <input placeholder="VD: DEMO-SV001" {...form.register('document')} />
            </Field>
            <Button disabled={eligibility.isPending}>Gửi hồ sơ ưu đãi</Button>
            <ActionMessage action={eligibility} />
          </form>
          <hr className="divider" />
          {query.data?.eligibility.map(e => (
            <div key={e.id} className="between" style={{ marginTop: 12 }}>
              <span className="muted">{e.category}</span>
              <Badge
                tone={e.status === 'approved' ? 'green' : e.status === 'pending' ? 'amber' : 'red'}
              >
                {{ approved: 'Đã duyệt', pending: 'Chờ duyệt', rejected: 'Từ chối' }[e.status]}
              </Badge>
            </div>
          ))}
        </Card>
      </div>
      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Xác nhận vé tháng">
        <p>
          Đăng ký / gia hạn tuyến {catalog.data?.routes.find(r => r.id === confirm?.routeId)?.name}{' '}
          thêm 30 ngày.
        </p>
        <p className="muted">
          Demo không thu tiền thật. Thời hạn gia hạn được cộng từ ngày hết hạn nếu vé còn hiệu lực.
        </p>
        <ActionMessage action={buy} />
        <div className="row">
          <Button disabled={buy.isPending} onClick={() => buy.mutate(undefined)}>
            Xác nhận demo
          </Button>
          <Button variant="secondary" onClick={() => setConfirm(null)}>
            Đóng
          </Button>
        </div>
      </Modal>
    </>
  );
}

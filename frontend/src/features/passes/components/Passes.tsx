import { TicketQr } from '@/features/tickets/components/Tickets';
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
  const [gateway, setGateway] = useState('MoMo');
  const [route, setRoute] = useState(''),
    [confirm, setConfirm] = useState<{ routeId: string; id?: string } | null>(null);
  const buy = useAction(async () => {
    if (!confirm) throw new Error('Chọn tuyến.');
    const result = await passesApi.buy(user.id, confirm.routeId, confirm.id, gateway);
    if (!appConfig.demo && result.redirectUrl) {
      const url = new URL(result.redirectUrl);
      if (
        url.protocol !== 'https:' &&
        !(url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname))
      )
        throw new Error('Liên kết thanh toán không hợp lệ.');
      window.location.assign(url.href);
    }
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
        description={
          appConfig.demo
            ? 'Quản lý tuyến quen thuộc và thời hạn sử dụng. Giá dưới đây là chính sách demo.'
            : 'Mua/gia hạn vé tháng theo tuyến; chỉ kích hoạt sau khi cổng thanh toán xác nhận.'
        }
      />
      <div className="grid">
        <div className="stack">
          <Card>
            <div className="row">
              <CreditCard color="#15803d" />
              <h3>Đăng ký vé tháng</h3>
            </div>
            <p className="muted">
              {appConfig.demo ? (
                <>
                  Demo: {money(250000)} / 30 ngày. Hồ sơ được duyệt: {money(150000)}. Không thu tiền
                  thật.
                </>
              ) : (
                `Giá theo hồ sơ hiện tại: ${money(query.data?.policy?.monthlyPrice ?? 0)} / 30 ngày. Giá được xác nhận khi khởi tạo thanh toán.`
              )}
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
          {query.data?.orders?.map(o => (
            <Card key={o.id}>
              <p>Đơn vé tháng đang chờ thanh toán · {money(o.price)}</p>
              {o.redirectUrl && (
                <Button onClick={() => window.location.assign(o.redirectUrl!)}>
                  Tiếp tục thanh toán
                </Button>
              )}
            </Card>
          ))}
          <AsyncState
            query={query}
            empty={query.data?.passes.length === 0}
            emptyText="Chưa đăng ký vé tháng"
          >
            {query.data?.passes.map(p => (
              <Card key={p.id}>
                {p.token && p.status === 'active' && Date.parse(p.expiresAt) > Date.now() && (
                  <TicketQr token={p.token} />
                )}
                {p.token && (
                  <details>
                    <summary>Mã vé tháng để soát thủ công</summary>
                    <Field label="Token vé tháng">
                      <textarea readOnly value={p.token} />
                    </Field>
                  </details>
                )}
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
                  disabled={buy.isPending}
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
                <option>Học sinh</option>
                <option>Sinh viên</option>
                <option>Người đi làm</option>
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
          {appConfig.demo
            ? 'Demo không thu tiền thật.'
            : 'Bạn sẽ chuyển tới cổng thanh toán. Vé chỉ kích hoạt sau xác nhận hợp lệ.'}{' '}
          Thời hạn gia hạn được cộng từ ngày hết hạn nếu vé còn hiệu lực.
        </p>
        <Field label="Phương thức thanh toán">
          <select value={gateway} onChange={e => setGateway(e.target.value)}>
            {['MoMo', 'VNPay', 'ZaloPay', 'Card'].map(g => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </Field>
        <ActionMessage action={buy} />
        <div className="row">
          <Button disabled={buy.isPending} onClick={() => buy.mutate(undefined)}>
            {appConfig.demo ? 'Xác nhận demo' : 'Thanh toán vé tháng'}
          </Button>
          <Button variant="secondary" onClick={() => setConfirm(null)}>
            Đóng
          </Button>
        </div>
      </Modal>
    </>
  );
}

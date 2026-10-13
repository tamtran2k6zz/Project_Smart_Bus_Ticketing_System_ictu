import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { request } from '@/services/http';
import { useAction } from '@/hooks/useAction';
import { Card, Field, Button, ActionMessage, AsyncState } from '@/components/ui/Ui';
import { appConfig } from '@/configs/app.config';
interface Policy {
  category: string;
  ticket_discount_percent: number;
  monthly_price: number;
}
const labels: Record<string, string> = {
  NONE: 'Thông thường',
  STUDENT: 'Học sinh / sinh viên',
  ELDERLY: 'Người cao tuổi',
  WORKER: 'Người đi làm',
  DISABLED: 'Người khuyết tật',
};
export function FarePolicies() {
  const query = useQuery({
    queryKey: ['fare-policies'],
    queryFn: () => request<Policy[]>('/fare-policies'),
    enabled: !appConfig.demo,
  });
  const [draft, setDraft] = useState<Policy | null>(null);
  const save = useAction(async () => {
    if (!draft) return;
    await request('/fare-policies/' + draft.category, 'PUT', {
      ticketDiscount: draft.ticket_discount_percent,
      monthlyPrice: draft.monthly_price,
    });
    setDraft(null);
  }, 'Đã cập nhật chính sách giá.');
  if (appConfig.demo) return null;
  return (
    <Card>
      <h3>Chính sách giá vé lượt / vé tháng</h3>
      <p className="muted">
        Thay đổi áp dụng cho đơn mới; giữ nguyên giá đã xác nhận khi khách đặt.
      </p>
      <ActionMessage action={save} />
      <AsyncState query={query}>
        {query.data?.map(p => (
          <div className="between" key={p.category}>
            <p>
              {labels[p.category]} · giảm {p.ticket_discount_percent}% · vé tháng{' '}
              {p.monthly_price.toLocaleString('vi-VN')}đ
            </p>
            <Button variant="secondary" onClick={() => setDraft({ ...p })}>
              Sửa chính sách
            </Button>
          </div>
        ))}
      </AsyncState>
      {draft && (
        <form
          className="formGrid"
          onSubmit={e => {
            e.preventDefault();
            save.mutate(undefined);
          }}
        >
          <strong>{labels[draft.category]}</strong>
          <Field label="Giảm vé lượt (%)">
            <input
              type="number"
              min={0}
              max={80}
              required
              value={draft.ticket_discount_percent}
              onChange={e =>
                setDraft({ ...draft, ticket_discount_percent: Number(e.target.value) })
              }
            />
          </Field>
          <Field label="Giá vé tháng (VND)">
            <input
              type="number"
              min={1000}
              max={10000000}
              required
              value={draft.monthly_price}
              onChange={e => setDraft({ ...draft, monthly_price: Number(e.target.value) })}
            />
          </Field>
          <Button disabled={save.isPending}>Lưu chính sách</Button>
        </form>
      )}
    </Card>
  );
}

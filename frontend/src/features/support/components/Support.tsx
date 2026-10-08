import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSession } from '@/store/session.store';
import { useAction } from '@/hooks/useAction';
import { supportApi } from '../services/support.api';
import { ticketsApi } from '@/features/tickets/services/tickets.api';
import {
  PageTitle,
  Card,
  Field,
  Button,
  Badge,
  AsyncState,
  ActionMessage,
  Modal,
} from '@/components/ui/Ui';
import { dateTime } from '@/utils/format';
const schema = z.object({
  subject: z.string().trim().min(3, 'Tiêu đề ít nhất 3 ký tự'),
  message: z.string().trim().min(10, 'Nội dung ít nhất 10 ký tự'),
  rating: z.coerce.number().min(1).max(5),
});
export function Support({ admin = false }: { admin?: boolean }) {
  const user = useSession(s => s.user)!;
  const query = useQuery({
    queryKey: ['support', user.id, admin],
    queryFn: () => supportApi.list(user.id, admin),
  });
  const requests = useQuery({
    queryKey: ['ticket-requests', user.id],
    queryFn: () => ticketsApi.requests(user.id),
    enabled: admin,
  });
  const form = useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { subject: '', message: '', rating: 5 },
  });
  const send = useAction(async (v: z.output<typeof schema>) => {
    await supportApi.send(user.id, v.subject, v.message, v.rating);
    form.reset();
  }, 'Đã gửi phản ánh. Theo dõi phản hồi bên dưới.');
  const [selected, setSelected] = useState(''),
    [reply, setReply] = useState('');
  const respond = useAction(async () => {
    await supportApi.reply(user.id, selected, reply);
    setSelected('');
    setReply('');
  });
  const resolve = useAction(
    ({ id, approve }: { id: string; approve: boolean }) => ticketsApi.resolve(id, user.id, approve),
    'Đã xử lý yêu cầu vé.'
  );
  return (
    <>
      <PageTitle
        eyebrow={admin ? 'CHĂM SÓC KHÁCH HÀNG' : 'CHÚNG TÔI LẮNG NGHE BẠN'}
        title={admin ? 'Hỗ trợ & yêu cầu vé' : 'Hỗ trợ & phản ánh'}
        description="Gửi câu hỏi, góp ý và đánh giá trải nghiệm hành trình."
      />
      {!admin && (
        <Card>
          <form className="formGrid" onSubmit={form.handleSubmit(v => send.mutate(v))}>
            <Field label="Tiêu đề" error={form.formState.errors.subject?.message}>
              <input {...form.register('subject')} />
            </Field>
            <Field label="Đánh giá trải nghiệm">
              <select {...form.register('rating')}>
                {[5, 4, 3, 2, 1].map(n => (
                  <option key={n} value={n}>
                    {n} / 5 sao
                  </option>
                ))}
              </select>
            </Field>
            <div className="full">
              <Field label="Nội dung phản ánh" error={form.formState.errors.message?.message}>
                <textarea {...form.register('message')} />
              </Field>
            </div>
            <div className="full">
              <Button disabled={send.isPending}>Gửi phản ánh</Button>
              <ActionMessage action={send} />
            </div>
          </form>
        </Card>
      )}
      {admin && (
        <>
          <h3>Yêu cầu hủy / đổi vé</h3>
          <ActionMessage action={resolve} />
          <AsyncState
            query={requests}
            empty={requests.data?.length === 0}
            emptyText="Chưa có yêu cầu vé"
          >
            <div className="stack">
              {requests.data?.map(t => (
                <Card key={t.id}>
                  <div className="between">
                    <div>
                      <Badge tone="amber">
                        {t.request === 'cancel' ? 'Yêu cầu hủy' : 'Yêu cầu đổi'}
                      </Badge>
                      <p className="muted">
                        Vé {t.id}
                        <br />
                        Chuyến {t.tripId}
                        {t.exchangeTripId && ' → ' + t.exchangeTripId}
                      </p>
                    </div>
                    <div className="row">
                      <Button
                        disabled={resolve.isPending}
                        onClick={() => resolve.mutate({ id: t.id, approve: true })}
                      >
                        Duyệt
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={resolve.isPending}
                        onClick={() => resolve.mutate({ id: t.id, approve: false })}
                      >
                        Từ chối
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </AsyncState>
        </>
      )}
      <h3>{admin ? 'Phản ánh của hành khách' : 'Lịch sử phản ánh'}</h3>
      <AsyncState query={query} empty={query.data?.length === 0} emptyText="Chưa có phản ánh">
        <div className="stack">
          {query.data?.map(s => (
            <Card key={s.id}>
              <div className="between">
                <h3 style={{ margin: 0 }}>{s.subject}</h3>
                <Badge tone={s.status === 'open' ? 'amber' : 'green'}>
                  {s.status === 'open' ? 'Chờ phản hồi' : 'Đã phản hồi'}
                </Badge>
              </div>
              <p>{s.message}</p>
              <p className="muted">
                {dateTime(s.createdAt)} · Đánh giá {s.rating}/5
              </p>
              {s.reply && (
                <div style={{ padding: 16, background: '#edf7ef', borderRadius: 10, fontSize: 13 }}>
                  Phản hồi nhà xe: {s.reply}
                </div>
              )}
              {admin && s.status === 'open' && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSelected(s.id);
                    respond.clear();
                  }}
                >
                  Trả lời phản ánh
                </Button>
              )}
            </Card>
          ))}
        </div>
      </AsyncState>
      <Modal open={!!selected} onClose={() => setSelected('')} title="Trả lời phản ánh">
        <Field label="Nội dung phản hồi">
          <textarea value={reply} onChange={e => setReply(e.target.value)} />
        </Field>
        <ActionMessage action={respond} />
        <Button
          style={{ marginTop: 15 }}
          disabled={respond.isPending}
          onClick={() => respond.mutate(undefined)}
        >
          Gửi phản hồi trong ứng dụng
        </Button>
      </Modal>
    </>
  );
}

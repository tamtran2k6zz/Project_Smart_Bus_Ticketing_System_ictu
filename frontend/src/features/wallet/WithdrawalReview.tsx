import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAction } from '@/hooks/useAction';
import { useSession } from '@/store/session.store';
import { appConfig } from '@/configs/app.config';
import { Card, Button, Field, Modal, ActionMessage, AsyncState, Badge } from '@/components/ui/Ui';
import { money, dateTime } from '@/utils/format';
import { walletApi, type Withdrawal } from './wallet.api';
export function WithdrawalReview() {
  const user = useSession(s => s.user)!;
  const allowed = ['ADMIN', 'FINANCE'].includes(user.role) && !appConfig.demo;
  const query = useQuery({
    queryKey: ['wallet-withdrawal-review', user.id],
    queryFn: walletApi.reviewList,
    enabled: allowed,
  });
  const [selected, setSelected] = useState<Withdrawal | null>(null),
    [status, setStatus] = useState<'PAID' | 'REJECTED'>('PAID');
  const [reference, setReference] = useState(''),
    [note, setNote] = useState(''),
    [checked, setChecked] = useState(false);
  const review = useAction(async () => {
    if (!selected || !checked) throw new Error('Xác nhận đã kiểm tra thông tin trước khi xử lý.');
    await walletApi.review(selected.id, status, reference, note);
    setSelected(null);
  }, 'Đã xử lý yêu cầu rút tiền.');
  if (!allowed) return null;
  return (
    <Card>
      <h3>Duyệt rút tiền từ ví</h3>
      <p className="muted">
        Chuyển khoản thủ công bên ngoài hệ thống trước khi xác nhận. Đối chiếu đúng người nhận, số
        tiền và mã giao dịch; xác nhận tại đây chỉ ghi nhận kết quả chuyển khoản.
      </p>
      <ActionMessage action={review} />
      <AsyncState
        query={query}
        empty={query.data?.length === 0}
        emptyText="Chưa có yêu cầu rút tiền"
      >
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Khách hàng / yêu cầu</th>
                <th>Tài khoản nhận</th>
                <th>Số tiền</th>
                <th>Trạng thái</th>
                <th>Xử lý</th>
              </tr>
            </thead>
            <tbody>
              {query.data?.map(w => (
                <tr key={w.id}>
                  <td>
                    {w.customer_name}
                    <br />
                    <small>
                      {dateTime(w.created_at)} · {w.id}
                    </small>
                  </td>
                  <td>
                    {w.bank_name}
                    <br />
                    {w.bank_account_number}
                    <br />
                    {w.account_holder_name}
                  </td>
                  <td>{money(w.amount)}</td>
                  <td>
                    <Badge
                      tone={
                        w.status === 'PAID' ? 'green' : w.status === 'PENDING' ? 'amber' : 'red'
                      }
                    >
                      {
                        { PAID: 'Đã chuyển khoản', PENDING: 'Chờ xử lý', REJECTED: 'Đã từ chối' }[
                          w.status
                        ]
                      }
                    </Badge>
                    <br />
                    {w.bank_reference || w.review_note}
                  </td>
                  <td>
                    {w.status === 'PENDING' && w.user_id !== user.id && (
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setSelected(w);
                          setStatus('PAID');
                          setReference('');
                          setNote('');
                          setChecked(false);
                          review.clear();
                        }}
                      >
                        Xử lý
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AsyncState>
      <Modal
        open={!!selected}
        onClose={() => {
          if (!review.isPending) setSelected(null);
        }}
        title="Xử lý yêu cầu rút tiền"
      >
        <p>
          <strong>{money(selected?.amount || 0)}</strong> → {selected?.bank_name} ·{' '}
          {selected?.bank_account_number}
          <br />
          {selected?.account_holder_name}
        </p>
        <form
          className="stack"
          onSubmit={e => {
            e.preventDefault();
            review.mutate(undefined);
          }}
        >
          <Field label="Kết quả xử lý">
            <select
              value={status}
              onChange={e => {
                setStatus(e.target.value as 'PAID' | 'REJECTED');
                setChecked(false);
              }}
            >
              <option value="PAID">Đã chuyển khoản thành công</option>
              <option value="REJECTED">Từ chối và trả tiền về ví</option>
            </select>
          </Field>
          {status === 'PAID' && (
            <Field label="Mã giao dịch ngân hàng">
              <input
                required
                minLength={3}
                maxLength={150}
                value={reference}
                onChange={e => setReference(e.target.value)}
              />
            </Field>
          )}
          <Field label={status === 'REJECTED' ? 'Lý do từ chối' : 'Ghi chú đối soát'}>
            <textarea
              required={status === 'REJECTED'}
              minLength={status === 'REJECTED' ? 5 : 0}
              maxLength={500}
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </Field>
          <label className="row">
            <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} />
            {status === 'PAID'
              ? 'Tôi đã chuyển khoản và đối chiếu đúng thông tin, số tiền.'
              : 'Tôi xác nhận từ chối; hệ thống sẽ trả tiền lại ví khách hàng.'}
          </label>
          <ActionMessage action={review} />
          <Button disabled={!checked || review.isPending}>Xác nhận kết quả</Button>
        </form>
      </Modal>
    </Card>
  );
}

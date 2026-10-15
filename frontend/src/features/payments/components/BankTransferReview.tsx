import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/store/session.store';
import { useAction } from '@/hooks/useAction';
import { appConfig } from '@/configs/app.config';
import { Card, Button, Field, Modal, ActionMessage, AsyncState, Badge } from '@/components/ui/Ui';
import { money, dateTime } from '@/utils/format';
import { bankTransferApi, type TransferReview } from '../services/bank-transfer.api';

export function BankTransferReview() {
  const user = useSession(s => s.user)!;
  const allowed = ['ADMIN', 'FINANCE'].includes(user.role) && !appConfig.demo;
  const query = useQuery({
    queryKey: ['bank-transfer-review', user.id],
    queryFn: bankTransferApi.list,
    enabled: allowed,
    refetchInterval: 15000,
  });
  const [selected, setSelected] = useState<TransferReview | null>(null);
  const [action, setAction] = useState<'CONFIRM' | 'REJECT'>('CONFIRM');
  const [amount, setAmount] = useState(''),
    [bankId, setBankId] = useState(''),
    [note, setNote] = useState(''),
    [checked, setChecked] = useState(false);
  const review = useAction(
    async () => {
      if (!selected || !checked) throw new Error('Hãy xác nhận đã kiểm tra sao kê ngân hàng.');
      const result = await bankTransferApi.review(selected.ticket_id, {
        action,
        receivedAmount: Number(amount),
        bankTransactionId: bankId,
        note,
      });
      setSelected(null);
      return result;
    },
    r =>
      r.status === 'REFUNDED'
        ? 'Đã ghi nhận tiền thực nhận vào ví khách hàng; không phát hành vé.'
        : r.status === 'CONFIRMED'
          ? 'Đã xác nhận nhận tiền và phát hành vé.'
          : 'Đã từ chối xác nhận nhận tiền, giải phóng ghế.'
  );
  if (!allowed) return null;
  return (
    <Card>
      <h3>Đối soát chuyển khoản Techcombank</h3>
      <p className="muted">
        Đối chiếu báo có trên tài khoản nhận với số tiền và nội dung đơn trước khi xác nhận. Không
        xác nhận chỉ dựa vào ảnh biên lai của khách. Hiển thị tối đa 100 giao dịch, ưu tiên giao
        dịch chờ xử lý.
      </p>
      <ActionMessage action={review} />
      <AsyncState
        query={query}
        empty={query.data?.length === 0}
        emptyText="Chưa có chuyển khoản cần đối soát"
      >
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Khách hàng / nội dung</th>
                <th>Tài khoản nhận</th>
                <th>Số tiền</th>
                <th>Trạng thái</th>
                <th>Xử lý</th>
              </tr>
            </thead>
            <tbody>
              {query.data?.map(t => (
                <tr key={t.ticket_id}>
                  <td>
                    {t.customer_name}
                    <br />
                    <strong>{t.reference}</strong>
                    <br />
                    <small>
                      {dateTime(t.created_at)} · {t.route_name}
                    </small>
                    {t.sender_reference && <p>Mã khách cung cấp: {t.sender_reference}</p>}
                  </td>
                  <td>
                    {t.bank_name}
                    <br />
                    {t.account_number}
                    <br />
                    {t.account_holder}
                  </td>
                  <td>
                    {money(t.amount)}
                    {t.received_amount != null && <p>Thực nhận: {money(t.received_amount)}</p>}
                  </td>
                  <td>
                    <Badge
                      tone={
                        t.status === 'CONFIRMED'
                          ? 'green'
                          : ['PENDING', 'SUBMITTED'].includes(t.status)
                            ? 'amber'
                            : 'neutral'
                      }
                    >
                      {
                        {
                          PENDING: 'Chưa báo chuyển',
                          SUBMITTED: 'Khách đã báo chuyển',
                          CONFIRMED: 'Đã nhận tiền',
                          REFUNDED: 'Đã vào ví',
                          REJECTED: 'Chưa xác nhận',
                        }[t.status]
                      }
                    </Badge>
                    <br />
                    {t.bank_transaction_id || t.review_note}
                  </td>
                  <td>
                    {['PENDING', 'SUBMITTED', 'REJECTED'].includes(t.status) &&
                      t.user_id !== user.id && (
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setSelected(t);
                            setAction('CONFIRM');
                            setAmount(String(t.amount));
                            setBankId('');
                            setNote('');
                            setChecked(false);
                            review.clear();
                          }}
                        >
                          Đối soát
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
        title="Kiểm tra báo có ngân hàng"
      >
        <p>
          <strong>{selected?.reference}</strong> · {money(selected?.amount || 0)}
          <br />
          {selected?.customer_name} → {selected?.account_number}
        </p>
        <form
          className="stack"
          onSubmit={e => {
            e.preventDefault();
            review.mutate(undefined);
          }}
        >
          <Field label="Kết quả đối soát">
            <select
              value={action}
              onChange={e => {
                setAction(e.target.value as 'CONFIRM' | 'REJECT');
                setChecked(false);
              }}
            >
              <option value="CONFIRM">Đã nhận tiền trong sao kê</option>
              <option value="REJECT">Chưa tìm thấy tiền, từ chối xác nhận</option>
            </select>
          </Field>
          {action === 'CONFIRM' && (
            <>
              <Field label="Số tiền thực nhận (đồng)">
                <input
                  type="number"
                  required
                  min={1}
                  max={10000000}
                  step={1}
                  value={amount}
                  onChange={e => {
                    setAmount(e.target.value);
                    setChecked(false);
                  }}
                />
              </Field>
              <Field label="Mã giao dịch báo có tại ngân hàng">
                <input
                  required
                  minLength={3}
                  maxLength={150}
                  value={bankId}
                  onChange={e => {
                    setBankId(e.target.value);
                    setChecked(false);
                  }}
                />
              </Field>
              <p className="muted">
                Nếu số tiền không khớp, đơn đã đổi hoặc ghế hết hạn, tiền thực nhận sẽ được cộng vào
                ví khách; hệ thống không phát hành vé. Một mã giao dịch ngân hàng chỉ được ghi nhận
                một lần.
              </p>
            </>
          )}
          <Field label={action === 'REJECT' ? 'Lý do chưa xác nhận' : 'Ghi chú đối soát'}>
            <textarea
              required={action === 'REJECT'}
              minLength={action === 'REJECT' ? 5 : 0}
              maxLength={500}
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </Field>
          <label className="row">
            <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} />
            {action === 'CONFIRM'
              ? 'Tôi đã đối chiếu số tiền, nội dung và mã báo có trên tài khoản nhận.'
              : 'Tôi xác nhận chưa có báo có phù hợp; ghế sẽ được giải phóng.'}
          </label>
          <ActionMessage action={review} />
          <Button disabled={!checked || review.isPending}>Xác nhận đối soát</Button>
        </form>
      </Modal>
    </Card>
  );
}

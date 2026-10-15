import { useState } from 'react';
import { Copy, Download, QrCode } from 'lucide-react';
import { Badge, Button, Field, Message, ActionMessage, LinkButton } from '@/components/ui/Ui';
import { useAction } from '@/hooks/useAction';
import { money } from '@/utils/format';
import { bankTransferApi } from '../services/bank-transfer.api';
import type { BankTransfer } from '../types';
import s from './BankTransferPanel.module.css';

export function BankTransferPanel({
  id,
  transfer: t,
  canTransfer,
}: {
  id: string;
  transfer: BankTransfer;
  canTransfer: boolean;
}) {
  const [senderReference, setSenderReference] = useState(''),
    [checked, setChecked] = useState(false);
  const copy = useAction((text: string) => navigator.clipboard.writeText(text), 'Đã sao chép.');
  const submit = useAction(async () => {
    if (!checked) throw new Error('Hãy xác nhận đã chuyển khoản.');
    return bankTransferApi.submit(id, senderReference);
  }, 'Đã báo chuyển khoản. Tài chính sẽ kiểm tra báo có; vé chưa được phát hành.');
  const open = ['PENDING', 'SUBMITTED'].includes(t.status);
  return (
    <section aria-label="Chuyển khoản Techcombank" className={s.panel}>
      <h3 className="row">
        <QrCode size={22} /> Mã QR Techcombank
      </h3>
      <Badge tone={t.status === 'CONFIRMED' ? 'green' : 'amber'}>
        {
          {
            PENDING: 'Chờ chuyển khoản',
            SUBMITTED: 'Chờ tài chính đối soát',
            CONFIRMED: 'Đã nhận tiền',
            REFUNDED: 'Đã cộng tiền vào ví',
            REJECTED: 'Chưa xác nhận nhận tiền',
          }[t.status]
        }
      </Badge>
      {t.status === 'PENDING' && canTransfer && (
        <>
          <p>
            Quét mã bằng ứng dụng ngân hàng, hoặc nhập thông tin tài khoản bên dưới. Chuyển đúng số
            tiền và giữ nguyên nội dung để đối soát.
          </p>
          <div className={s.qr}>
            <img
              src={t.qrImage}
              alt="QR chuyển khoản Techcombank theo số tiền và nội dung đặt vé"
              width={280}
              height={280}
            />
            <a href={t.qrImage} download={'Techcombank-' + t.reference + '.png'}>
              <Download size={16} /> Tải mã QR
            </a>
          </div>
        </>
      )}
      <dl className={s.details}>
        <dt>Ngân hàng</dt>
        <dd>{t.bankName}</dd>
        <dt>Chủ tài khoản</dt>
        <dd>{t.accountHolder}</dd>
        <dt>Số tài khoản</dt>
        <dd>
          <strong>{t.accountNumber}</strong>
          <Button
            type="button"
            variant="secondary"
            onClick={() => copy.mutate(t.accountNumber)}
            aria-label="Sao chép số tài khoản"
          >
            <Copy size={16} />
          </Button>
        </dd>
        <dt>Số tiền</dt>
        <dd>
          <strong>{money(t.amount)}</strong>
        </dd>
        <dt>Nội dung chuyển khoản</dt>
        <dd>
          <code>{t.reference}</code>
          <Button
            type="button"
            variant="secondary"
            onClick={() => copy.mutate(t.reference)}
            aria-label="Sao chép nội dung chuyển khoản"
          >
            <Copy size={16} />
          </Button>
        </dd>
      </dl>
      <ActionMessage action={copy} />
      {open && (
        <>
          <Message>
            {canTransfer
              ? 'Chỉ chuyển khoản một lần. Nút “Tôi đã chuyển khoản” gửi thông báo cho tài chính; vé chỉ được cấp sau khi tài chính xác nhận tiền đã vào tài khoản.'
              : 'Đã hết thời gian giữ ghế. Không chuyển thêm tiền. Nếu bạn đã chuyển, hãy báo bên dưới để tài chính đối soát; tiền đến muộn sẽ được cộng vào ví để bạn đặt lại.'}
          </Message>
          {t.status === 'SUBMITTED' || submit.isSuccess ? (
            <p>
              Đã gửi thông báo. Vui lòng chờ đối soát, không chuyển khoản lại. Trang tự cập nhật
              trạng thái.
            </p>
          ) : (
            <form
              className="stack"
              onSubmit={e => {
                e.preventDefault();
                submit.mutate(undefined);
              }}
            >
              <Field label="Mã giao dịch của bạn (nếu có)">
                <input
                  maxLength={150}
                  value={senderReference}
                  onChange={e => setSenderReference(e.target.value)}
                  placeholder="Tra cứu trong lịch sử ứng dụng ngân hàng"
                />
              </Field>
              <label className="row">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={e => setChecked(e.target.checked)}
                />{' '}
                Tôi đã chuyển tiền tới đúng tài khoản trên
              </label>
              <Button disabled={!checked || submit.isPending}>Tôi đã chuyển khoản</Button>
            </form>
          )}
        </>
      )}
      <ActionMessage action={submit} />
      {t.reviewNote && <p>Ghi chú đối soát: {t.reviewNote}</p>}
      {t.status === 'REFUNDED' && (
        <>
          <Message>
            Đã nhận tiền nhưng không phát hành vé do ghế hết hạn, đơn đã đổi hoặc số tiền không
            khớp. Tiền thực nhận đã được cộng vào ví.
          </Message>
          <LinkButton to="/account/wallet">Xem ví của tôi</LinkButton>
        </>
      )}
    </section>
  );
}

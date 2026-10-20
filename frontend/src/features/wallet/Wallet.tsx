import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowDownToLine, ArrowUpRight, Wallet as WalletIcon, RefreshCw } from 'lucide-react';
import { useSession } from '@/store/session.store';
import { useAction } from '@/hooks/useAction';
import { appConfig } from '@/configs/app.config';
import {
  PageTitle,
  Card,
  Button,
  Field,
  AsyncState,
  ActionMessage,
  Badge,
  Modal,
} from '@/components/ui/Ui';
import { money, dateTime } from '@/utils/format';
import { passesApi } from '@/features/passes/services/passes.api';
import { operationsApi } from '@/features/operations/services/operations.api';
import { walletApi, openPayment } from './wallet.api';
import s from './Wallet.module.css';

export default function Wallet() {
  const user = useSession(v => v.user)!;
  const query = useQuery({
    queryKey: ['wallet', user.id],
    queryFn: walletApi.overview,
    enabled: !appConfig.demo,
    refetchInterval: 15000,
  });
  const passes = useQuery({
    queryKey: ['passes', user.id],
    queryFn: () => passesApi.list(user.id),
    enabled: !appConfig.demo,
  });
  const catalog = useQuery({
    queryKey: ['catalog'],
    queryFn: operationsApi.catalog,
    enabled: !appConfig.demo,
  });
  const [modal, setModal] = useState<'topup' | 'withdraw' | ''>('');
  const [amount, setAmount] = useState(100000),
    [method, setMethod] = useState('VNPAY');
  const [bankName, setBank] = useState(''),
    [bankAccountNumber, setAccount] = useState(''),
    [accountHolderName, setHolder] = useState(user.name);
  const [route, setRoute] = useState(''),
    [limit, setLimit] = useState(250000),
    [consent, setConsent] = useState(false);
  const intent = useRef({ body: '', key: '' });
  const keyFor = (body: string) => {
    if (intent.current.body !== body) intent.current = { body, key: crypto.randomUUID() };
    return intent.current.key;
  };
  const transfer = useAction(async () => {
    if (modal === 'topup') {
      const payload = { amount, method };
      const result = await walletApi.topup({
        ...payload,
        requestKey: keyFor(JSON.stringify(payload)),
      });
      if (result.status === 'FAILED') {
        intent.current = { body: '', key: '' };
        throw new Error('Giao dịch trước chưa thành công. Bấm tiếp tục để tạo giao dịch nạp mới.');
      }
      if (result.status === 'SUCCESS') {
        setModal('');
        intent.current.body = '';
        return;
      }
      if (!result.redirectUrl)
        throw new Error('Chưa tạo được liên kết thanh toán. Vui lòng thử lại.');
      openPayment(result.redirectUrl);
    } else {
      const payload = { amount, bankName, bankAccountNumber, accountHolderName };
      await walletApi.withdraw({ ...payload, requestKey: keyFor(JSON.stringify(payload)) });
      intent.current.body = '';
      setModal('');
    }
  }, 'Yêu cầu đã được ghi nhận. Kiểm tra trạng thái bên dưới.');
  const subscribe = useAction(async () => {
    if (!consent) throw new Error('Xác nhận cho phép hệ thống tự trừ tiền trước khi bật.');
    await walletApi.subscription(route, true, limit);
    setConsent(false);
  }, 'Đã bật tự động gia hạn vé tháng.');
  const disable = useAction(
    (routeId: string) =>
      walletApi.subscription(
        routeId,
        false,
        query.data?.subscriptions.find(x => x.route_id === routeId)?.max_amount || limit
      ),
    'Đã tắt tự động gia hạn.'
  );
  const locked = query.data?.wallet.status !== 'ACTIVE';
  const pending = query.data?.reservedBalance || 0;
  const open = (kind: 'topup' | 'withdraw') => {
    transfer.clear();
    setModal(kind);
  };
  return (
    <>
      <PageTitle
        eyebrow="TÀI CHÍNH CÁ NHÂN"
        title="Ví SmartBus"
        description="Tiền hoàn về ví. Chủ động nạp, rút và duy trì vé tháng của bạn."
        action={
          <Button
            variant="secondary"
            onClick={() => void query.refetch()}
            disabled={query.isFetching || appConfig.demo}
          >
            <RefreshCw size={16} /> Làm mới
          </Button>
        }
      />
      {appConfig.demo ? (
        <Card>
          <p>
            Ví cần kết nối API để xác nhận tiền thực tế. Chuyển ứng dụng sang chế độ API để sử dụng.
          </p>
        </Card>
      ) : (
        <AsyncState query={query}>
          {query.data && (
            <div className="stack">
              <div className={s.columns}>
                <section className={s.balance} aria-label="Số dư ví">
                  <div className="between">
                    <span className="row">
                      <WalletIcon size={20} /> SỐ DƯ KHẢ DỤNG
                    </span>
                    <span>{locked ? 'Đang khóa' : 'Đang hoạt động'}</span>
                  </div>
                  <div className={s.amount}>{money(query.data.wallet.balance)}</div>
                  <div className="row">
                    <Button variant="secondary" onClick={() => open('topup')} disabled={locked}>
                      <ArrowDownToLine size={17} /> Nạp tiền
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => open('withdraw')}
                      disabled={locked || query.data.wallet.balance < 10000}
                    >
                      <ArrowUpRight size={17} /> Rút về ngân hàng
                    </Button>
                  </div>
                  <p>
                    Đang chờ chuyển khoản: <strong>{money(pending)}</strong>
                  </p>
                  <small>Số dư khả dụng đã trừ các yêu cầu rút đang chờ duyệt.</small>
                </section>
                <Card>
                  <h3>Ví của bạn hoạt động thế nào?</h3>
                  <p className="muted">
                    Khi yêu cầu hủy vé được duyệt, tiền đã thanh toán được hoàn về ví. Bạn có thể
                    dùng số dư để thanh toán vé chuyến, mua/gia hạn vé tháng hoặc gửi yêu cầu rút.
                  </p>
                  <div className={s.hint}>
                    Rút tiền do bộ phận tài chính chuyển khoản thủ công. Chỉ hiển thị “Đã chuyển
                    khoản” sau khi tài chính xác nhận mã giao dịch ngân hàng.
                  </div>
                  <p className="muted">
                    Nạp từ 10.000 đ đến 10.000.000 đ/lần. Số dư chỉ tăng sau xác nhận hợp lệ từ cổng
                    thanh toán.
                  </p>
                </Card>
              </div>
              <ActionMessage action={transfer} />
              <div className={s.columns}>
                <div className="stack">
                  <Card>
                    <div className="between">
                      <h3>Tự động gia hạn vé tháng</h3>
                      <Badge tone="green">30 ngày / kỳ</Badge>
                    </div>
                    <p className="muted">
                      Khi vé hết hạn, hệ thống dùng số dư ví để gia hạn thêm 30 ngày theo giá ưu đãi
                      hiện tại, tối đa hạn mức bạn cho phép. Nếu thiếu tiền, hệ thống thử lại mỗi
                      ngày; thời gian chờ không có vé hợp lệ.
                    </p>
                    <form
                      className="stack"
                      onSubmit={e => {
                        e.preventDefault();
                        subscribe.mutate(undefined);
                      }}
                    >
                      <Field label="Vé tháng cần gia hạn">
                        <select
                          value={route}
                          onChange={e => {
                            setRoute(e.target.value);
                            setConsent(false);
                          }}
                          required
                        >
                          <option value="">Chọn vé tháng đã đăng ký</option>
                          {passes.data?.passes
                            .filter(p => p.status === 'active')
                            .map(p => (
                              <option key={p.routeId} value={p.routeId}>
                                {catalog.data?.routes.find(r => r.id === p.routeId)?.name ||
                                  p.routeId}
                              </option>
                            ))}
                        </select>
                      </Field>
                      <Field label="Hạn mức mỗi lần gia hạn (đ)">
                        <input
                          type="number"
                          min={1000}
                          max={10000000}
                          step={1000}
                          required
                          value={limit}
                          onChange={e => {
                            setLimit(Number(e.target.value));
                            setConsent(false);
                          }}
                        />
                      </Field>
                      <label className="row">
                        <input
                          type="checkbox"
                          checked={consent}
                          onChange={e => setConsent(e.target.checked)}
                        />{' '}
                        Tôi cho phép tự trừ ví mỗi kỳ, tối đa {money(limit)}.
                      </label>
                      <Button disabled={!route || !consent || locked || subscribe.isPending}>
                        Bật / cập nhật gia hạn
                      </Button>
                      <ActionMessage action={subscribe} />
                    </form>
                    <p>
                      <Link to="/account/passes">Đăng ký hoặc mua vé tháng bằng ví →</Link>
                    </p>
                    {query.data.subscriptions.map(sub => (
                      <div className={s.entry} key={sub.route_id}>
                        <div>
                          <strong>{sub.route_name}</strong>
                          <p>
                            <Badge tone={sub.enabled ? 'green' : 'neutral'}>
                              {sub.enabled ? 'Đang bật' : 'Đã tắt'}
                            </Badge>{' '}
                            · Tối đa {money(sub.max_amount)}
                          </p>
                          {sub.enabled && (
                            <p className="muted">
                              Lần kiểm tra tiếp: {dateTime(sub.next_attempt_at)}
                            </p>
                          )}
                          {sub.last_result && <p className="muted">{sub.last_result}</p>}
                        </div>
                        {sub.enabled && (
                          <Button
                            variant="secondary"
                            disabled={disable.isPending}
                            onClick={() => disable.mutate(sub.route_id)}
                          >
                            Tắt
                          </Button>
                        )}
                      </div>
                    ))}
                    <ActionMessage action={disable} />
                  </Card>
                  <Card>
                    <h3>Yêu cầu rút về ngân hàng</h3>
                    {query.data.withdrawals.length === 0 && (
                      <p className="muted">Chưa có yêu cầu rút tiền.</p>
                    )}
                    {query.data.withdrawals.map(w => (
                      <div key={w.id} className={s.entry}>
                        <div>
                          <strong>
                            {w.bank_name} · {w.bank_account_number}
                          </strong>
                          <p className="muted">
                            {w.account_holder_name} · {dateTime(w.created_at)}
                          </p>
                          <Badge
                            tone={
                              w.status === 'PAID'
                                ? 'green'
                                : w.status === 'REJECTED'
                                  ? 'red'
                                  : 'amber'
                            }
                          >
                            {
                              {
                                PENDING: 'Chờ tài chính chuyển khoản',
                                PAID: 'Đã chuyển khoản',
                                REJECTED: 'Từ chối · Đã trả về ví',
                              }[w.status]
                            }
                          </Badge>
                          {w.bank_reference && <p>Mã ngân hàng: {w.bank_reference}</p>}
                          {w.review_note && <p className="muted">{w.review_note}</p>}
                        </div>
                        <strong>{money(w.amount)}</strong>
                      </div>
                    ))}
                  </Card>
                </div>
                <div className="stack">
                  <Card>
                    <h3>Lịch sử giao dịch</h3>
                    <p className="muted">
                      100 giao dịch gần nhất. Mỗi thay đổi số dư đều có bản ghi đối chiếu.
                    </p>
                    {query.data.transactions.length === 0 && (
                      <p>Chưa có giao dịch. Nạp tiền hoặc nhận hoàn tiền để bắt đầu.</p>
                    )}
                    {query.data.transactions.map(t => {
                      const positive = Number(t.balanceAfter) > Number(t.balanceBefore);
                      return (
                        <div key={t.id} className={s.entry}>
                          <div>
                            <strong>{t.description}</strong>
                            <p className="muted">{dateTime(t.createdAt)}</p>
                            <small className="muted">Số dư sau: {money(t.balanceAfter)}</small>
                          </div>
                          <span className={positive ? s.positive : s.negative}>
                            {positive ? '+' : '−'}
                            {money(t.amount)}
                          </span>
                        </div>
                      );
                    })}
                  </Card>
                  <Card>
                    <h3>Giao dịch nạp tiền</h3>
                    <p className="muted">
                      Trở về từ cổng thanh toán chưa đồng nghĩa nạp thành công. Trang tự cập nhật
                      khi nhận xác nhận.
                    </p>
                    {query.data.topups.length === 0 && (
                      <p className="muted">Chưa có giao dịch nạp.</p>
                    )}
                    {query.data.topups.map(t => (
                      <div className={s.entry} key={t.id}>
                        <div>
                          <strong>
                            {money(t.amount)} · {t.method}
                          </strong>
                          <p className="muted">{dateTime(t.created_at)}</p>
                          <Badge
                            tone={
                              t.status === 'SUCCESS'
                                ? 'green'
                                : t.status === 'FAILED'
                                  ? 'red'
                                  : 'amber'
                            }
                          >
                            {
                              {
                                SUCCESS: 'Đã cộng vào ví',
                                PENDING: 'Chờ thanh toán / xác nhận',
                                FAILED: 'Chưa thanh toán thành công',
                              }[t.status]
                            }
                          </Badge>
                        </div>
                        {t.status === 'PENDING' && t.payment_url && (
                          <Button
                            variant="secondary"
                            disabled={['MOMO', 'ZALOPAY'].includes(t.method)}
                            onClick={() => openPayment(t.payment_url!)}
                          >
                            Thanh toán
                          </Button>
                        )}
                      </div>
                    ))}
                  </Card>
                </div>
              </div>
            </div>
          )}
        </AsyncState>
      )}
      <Modal
        open={!!modal}
        onClose={() => {
          if (!transfer.isPending) setModal('');
        }}
        title={modal === 'topup' ? 'Nạp tiền vào ví' : 'Rút tiền về ngân hàng'}
      >
        <form
          className="stack"
          onSubmit={e => {
            e.preventDefault();
            transfer.mutate(undefined);
          }}
        >
          <Field label="Số tiền (đ)">
            <input
              type="number"
              min={10000}
              max={
                modal === 'withdraw'
                  ? Math.min(query.data?.wallet.balance || 0, 10000000)
                  : 10000000
              }
              step={1000}
              value={amount}
              onChange={e => setAmount(Number(e.target.value))}
              required
            />
          </Field>
          {modal === 'topup' ? (
            <>
              <Field label="Cổng thanh toán">
                <select value={method} onChange={e => setMethod(e.target.value)}>
                  <option value="VNPAY">VNPay</option>
                </select>
              </Field>
              <p className="muted">
                Bạn sẽ chuyển đến cổng thanh toán. Hệ thống chỉ cộng tiền sau khi xác minh kết quả.
              </p>
            </>
          ) : (
            <>
              <Field label="Tên ngân hàng">
                <input
                  required
                  minLength={2}
                  maxLength={100}
                  placeholder="VD: Vietcombank, Techcombank, MB Bank..."
                  value={bankName}
                  onChange={e => setBank(e.target.value)}
                />
              </Field>
              <Field label="Số tài khoản ngân hàng">
                <input
                  required
                  inputMode="numeric"
                  pattern="[0-9]{6,34}"
                  placeholder="Nhập số tài khoản nhận tiền"
                  value={bankAccountNumber}
                  onChange={e => setAccount(e.target.value)}
                />
              </Field>
              <Field label="Tên chủ tài khoản">
                <input
                  required
                  minLength={3}
                  maxLength={100}
                  placeholder="NGUYỄN VĂN A"
                  value={accountHolderName}
                  onChange={e => setHolder(e.target.value.toUpperCase())}
                />
              </Field>
              <div className={s.hint}>
                Kiểm tra kỹ thông tin nhận tiền. Khi gửi, {money(amount)} được trừ khỏi số dư khả
                dụng để chờ chuyển khoản. Nếu bị từ chối, tiền tự trả lại ví.
              </div>
            </>
          )}
          <ActionMessage action={transfer} />
          <div className="row">
            <Button disabled={transfer.isPending || locked}>
              {transfer.isPending
                ? 'Đang xử lý…'
                : modal === 'topup'
                  ? 'Tiếp tục thanh toán'
                  : 'Gửi yêu cầu rút tiền'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={transfer.isPending}
              onClick={() => setModal('')}
            >
              Đóng
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

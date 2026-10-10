import { useEffect, useId, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import type { Html5Qrcode } from 'html5-qrcode';
import { Camera, RefreshCw, ScanLine, TicketCheck, Users } from 'lucide-react';
import { useSession } from '@/store/session.store';
import { operationsApi } from '@/features/operations/services/operations.api';
import { listCheckedInPassengers, validateTicket } from '../services/checkin.api';
import { PageTitle, Card, Button, Field, Message, AsyncState } from '@/components/ui/Ui';
import { dateTime, errorText } from '@/utils/format';
import type { ValidationResult } from '../types';
import styles from './CheckinRoster.module.css';

export function ScanTicket() {
  const user = useSession(s => s.user)!,
    client = useQueryClient(),
    [params] = useSearchParams();
  const query = useQuery({
    queryKey: ['assigned', user.id],
    queryFn: () => operationsApi.assigned(user.id),
  });
  const catalog = useQuery({ queryKey: ['catalog'], queryFn: operationsApi.catalog });
  const [tripId, setTripId] = useState(params.get('tripId') || ''),
    [token, setToken] = useState(''),
    [result, setResult] = useState<ValidationResult>(),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [camera, setCamera] = useState(false);
  const checkedInQuery = useQuery({
    queryKey: ['checked-in-passengers', tripId],
    queryFn: () => listCheckedInPassengers(tripId),
    enabled: Boolean(tripId),
    // Polling lets an additional scanner tab refresh the roster without reloading the page.
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
  });
  const checkedInTickets = checkedInQuery.data ?? [];
  const checkedInPassengerCount = checkedInTickets.reduce(
    (total, ticket) => total + ticket.quantity,
    0
  );
  const elementId = 'qr-camera-' + useId().replace(/:/g, '');
  const scanner = useRef<Html5Qrcode | null>(null),
    mounted = useRef(true),
    starting = useRef(false),
    checking = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      const current = scanner.current;
      if (current?.isScanning)
        void current
          .stop()
          .then(() => current.clear())
          .catch(() => undefined);
    };
  }, []);

  async function stopCamera() {
    const current = scanner.current;
    if (current?.isScanning) await current.stop();
    current?.clear();
    if (mounted.current) setCamera(false);
  }

  async function validate(value: string) {
    if (checking.current) return;
    checking.current = true;
    setBusy(true);
    setError('');
    setResult(undefined);
    try {
      if (!navigator.onLine) throw new Error('Đang ngoại tuyến. Chưa thể xác minh vé.');
      if (!tripId) throw new Error('Chọn chuyến trước khi soát vé.');
      if (value.trim().length < 4) throw new Error('Nhập token QR hợp lệ.');
      const r = await validateTicket(user.id, tripId, value);
      if (mounted.current) {
        setResult(r);
        // Update counts/list immediately after a successful scan; polling also picks up other tabs.
        await client.invalidateQueries();
      }
    } catch (e) {
      if (mounted.current) setError(errorText(e));
    } finally {
      checking.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  async function startCamera() {
    if (!tripId) {
      setError('Chọn chuyến trước khi bật camera.');
      return;
    }
    if (starting.current) return;
    starting.current = true;
    setError('');
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      if (!mounted.current) return;
      const current = new Html5Qrcode(elementId);
      scanner.current = current;
      await current.start(
        { facingMode: 'environment' },
        { fps: 8, qrbox: { width: 230, height: 230 } },
        decoded => {
          setToken(decoded);
          void stopCamera().then(() => validate(decoded));
        },
        () => undefined
      );
      if (!mounted.current) await current.stop();
      else setCamera(true);
    } catch (e) {
      if (mounted.current)
        setError(
          'Không mở được camera. Cấp quyền trên HTTPS/localhost hoặc nhập token thủ công. ' +
            errorText(e)
        );
    } finally {
      starting.current = false;
    }
  }

  return (
    <>
      <PageTitle
        eyebrow="NHÂN VIÊN · XÁC THỰC VÉ"
        title="Soát vé QR"
        description="Kiểm tra đúng chuyến, thời hạn và trạng thái vé trước khi ghi nhận hành khách lên xe."
      />
      <AsyncState
        query={query}
        empty={query.data?.length === 0}
        emptyText="Bạn chưa được phân công chuyến"
      >
        <div className="grid">
          <Card>
            <Field label="Chuyến cần soát vé">
              <select
                value={tripId}
                disabled={camera}
                onChange={e => {
                  setTripId(e.target.value);
                  setResult(undefined);
                  setError('');
                }}
              >
                <option value="">Chọn chuyến</option>
                {query.data?.map(t => (
                  <option key={t.id} value={t.id}>
                    {dateTime(t.departure)} ·{' '}
                    {catalog.data?.routes.find(r => r.id === t.routeId)?.name}
                  </option>
                ))}
              </select>
            </Field>
            <div
              id={elementId}
              style={{
                minHeight: 220,
                marginBlock: 20,
                border: '1px dashed var(--border)',
                borderRadius: 12,
              }}
            />
            {camera ? (
              <Button
                variant="secondary"
                onClick={() => stopCamera().catch(e => setError(errorText(e)))}
              >
                Tắt camera
              </Button>
            ) : (
              <Button disabled={!tripId} onClick={() => void startCamera()}>
                <Camera size={18} />
                Bật camera đọc QR
              </Button>
            )}
            <p className="muted">
              Camera chỉ được yêu cầu khi bấm Bật camera. QR phải thuộc chuyến được phân công.
            </p>
          </Card>
          <Card>
            <h3 className="row">
              <ScanLine size={20} />
              Nhập token thủ công
            </h3>
            <form
              className="stack"
              onSubmit={e => {
                e.preventDefault();
                void validate(token);
              }}
            >
              <Field label="Token từ vé QR">
                <input
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  placeholder="SB-DEMO-…"
                  autoComplete="off"
                />
              </Field>
              <Button disabled={busy || !tripId}>
                {busy ? 'Đang xác minh…' : 'Xác thực & ghi nhận lên xe'}
              </Button>
            </form>
            <Message error>{error}</Message>
            {result && (
              <Message error={!result.valid}>
                {result.message}
                {result.quantity && ' · ' + result.quantity + ' hành khách'}
              </Message>
            )}
            <p className="muted">
              Vé không hợp lệ hoặc đã soát sẽ không làm tăng số khách đã xác nhận lên xe.
            </p>
          </Card>
        </div>

        <Card className={styles.roster}>
          <div className={styles.rosterHeader}>
            <div>
              <h2>Kiểm đếm khách đã soát vé</h2>
              <p>Danh sách tự cập nhật sau mỗi lượt quét và làm mới định kỳ.</p>
            </div>
            <span className={styles.liveTag}>
              <span className={styles.liveDot} aria-hidden="true" />
              CẬP NHẬT TRỰC TIẾP
            </span>
          </div>

          <div className={styles.stats} aria-live="polite" aria-atomic="true">
            <div className={styles.stat}>
              <span className={styles.statIcon}>
                <Users size={21} />
              </span>
              <div>
                <div className={styles.statLabel}>Hành khách đã soát</div>
                <div className={styles.statValue}>{checkedInPassengerCount}</div>
              </div>
            </div>
            <div className={styles.stat}>
              <span className={styles.statIcon}>
                <TicketCheck size={21} />
              </span>
              <div>
                <div className={styles.statLabel}>Vé đã xác nhận</div>
                <div className={styles.statValue}>{checkedInTickets.length}</div>
              </div>
            </div>
          </div>

          <div className={styles.listHeader}>
            <h3>Danh sách vé hợp lệ</h3>
            <small>
              {checkedInQuery.isFetching && <RefreshCw size={12} className="inlineIcon" />}{' '}
              Làm mới mỗi 3 giây
            </small>
          </div>

          {!tripId ? (
            <div className={styles.emptyState}>
              <strong>Chưa chọn chuyến</strong>
              Chọn chuyến được phân công để xem danh sách khách đã soát vé.
            </div>
          ) : checkedInQuery.isError ? (
            <Message error>Không tải được danh sách soát vé: {errorText(checkedInQuery.error)}</Message>
          ) : checkedInQuery.isPending ? (
            <div className={styles.emptyState}>Đang tải danh sách đã soát…</div>
          ) : checkedInTickets.length === 0 ? (
            <div className={styles.emptyState}>
              <strong>Chưa có khách nào được soát vé</strong>
              Khi quét thành công QR của chuyến này, danh sách sẽ tự cập nhật tại đây.
            </div>
          ) : (
            <ul className={styles.list}>
              {checkedInTickets.map(ticket => (
                <li className={styles.ticketRow} key={ticket.ticketId}>
                  <div className={styles.passengerInfo}>
                    <div className={styles.passengerName}>{ticket.passengerName}</div>
                    <div className={styles.ticketMeta}>
                      <span>
                        {ticket.seatNumbers.length > 0
                          ? 'Ghế ' + ticket.seatNumbers.join(', ')
                          : 'Không áp dụng số ghế'}
                      </span>
                      <span>
                        {ticket.checkedInAt
                          ? 'Đã soát lúc ' +
                            new Date(ticket.checkedInAt).toLocaleTimeString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })
                          : 'Đã soát trước đó'}
                      </span>
                    </div>
                    <div className={styles.ticketCode}>Mã vé: {ticket.ticketCode}</div>
                  </div>
                  <span className={styles.ticketCount}>
                    {ticket.quantity} khách
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </AsyncState>
    </>
  );
}

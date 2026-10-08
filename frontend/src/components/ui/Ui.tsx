import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  type ReactNode,
  type HTMLAttributes,
} from 'react';
import { X, ArrowRight, BusFront } from 'lucide-react';
import { Link } from 'react-router-dom';
import { errorText } from '@/utils/format';
import s from './Ui.module.css';
import { Button } from './Button';
export { Button } from './Button';
export function Logo() {
  return (
    <Link className={s.logo} to="/" aria-label="SmartBus trang chủ">
      <span>
        <BusFront size={23} />
      </span>
      <span className={s.wordmark}>
        <span>
          Smart<span className={s.brandGreen}>Bus</span>
        </span>
        <small>DI CHUYỂN THÔNG MINH</small>
      </span>
    </Link>
  );
}
export function Card({
  children,
  className = '',
  ...props
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div {...props} className={s.card + ' ' + className}>
      {children}
    </div>
  );
}
export function Badge({
  children,
  tone = 'green',
}: {
  children: ReactNode;
  tone?: 'green' | 'amber' | 'red' | 'neutral';
}) {
  return <span className={s.badge + ' ' + s[tone]}>{children}</span>;
}
export function Field({
  label,
  error,
  children,
  hint,
}: {
  label: string;
  error?: string;
  children: ReactNode;
  hint?: string;
}) {
  const id = useId();
  // Fields may wrap their control in an icon container. Preserve RHF's ref and handlers.
  const connect = (nodes: ReactNode): ReactNode =>
    Children.map(nodes, node => {
      if (!isValidElement<HTMLAttributes<HTMLElement> & { children?: ReactNode }>(node))
        return node;
      if (typeof node.type === 'string' && ['input', 'select', 'textarea'].includes(node.type)) {
        return cloneElement(node, {
          'aria-invalid': error ? true : undefined,
          'aria-labelledby':
            node.props['aria-labelledby'] || (node.props['aria-label'] ? undefined : id + '-label'),
          'aria-describedby':
            [node.props['aria-describedby'], hint && id + '-hint', error && id + '-error']
              .filter(Boolean)
              .join(' ') || undefined,
        });
      }
      return node.props.children
        ? cloneElement(node, { children: connect(node.props.children) })
        : node;
    });
  return (
    <label className={s.field}>
      <span id={id + '-label'}>{label}</span>
      {connect(children)}
      {hint && <small id={id + '-hint'}>{hint}</small>}
      {error && (
        <small id={id + '-error'} role="alert" className={s.error}>
          {error}
        </small>
      )}
    </label>
  );
}
export function Message({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return children ? (
    <div role={error ? 'alert' : 'status'} className={s.message + ' ' + (error ? s.errorBox : '')}>
      {children}
    </div>
  ) : null;
}
export function ActionMessage({ action }: { action: { message: string; errorMessage: string } }) {
  return (
    <>
      <Message error>{action.errorMessage}</Message>
      <Message>{action.message}</Message>
    </>
  );
}
export function PageTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className={s.pageTitle}>
      <div>
        {eyebrow && <span className={s.eyebrow}>{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function AsyncState({
  query,
  children,
  empty = false,
  emptyText = 'Chưa có dữ liệu.',
}: {
  query: { isPending: boolean; isError: boolean; error: unknown; refetch: () => unknown };
  children: ReactNode;
  empty?: boolean;
  emptyText?: string;
}) {
  if (query.isPending)
    return (
      <Card>
        <div className={s.skeleton} aria-label="Đang tải dữ liệu" />
        <p role="status">Đang tải dữ liệu…</p>
      </Card>
    );
  if (query.isError)
    return (
      <Card>
        <Message error>{errorText(query.error)}</Message>
        <Button variant="secondary" onClick={() => query.refetch()}>
          Thử lại
        </Button>
      </Card>
    );
  if (empty)
    return (
      <Card>
        <div className={s.empty}>
          <BusFront size={38} />
          <h3>{emptyText}</h3>
          <p>Dữ liệu mới sẽ hiển thị tại đây.</p>
        </div>
      </Card>
    );
  return <>{children}</>;
}
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open) {
      const previous = document.activeElement as HTMLElement;
      d.showModal();
      return () => {
        d.close();
        previous?.focus();
      };
    }
    d.close();
  }, [open]);
  return (
    <dialog ref={ref} className={s.modal} aria-labelledby={id} onCancel={() => closeRef.current()}>
      <div className={s.modalHead}>
        <h2 id={id}>{title}</h2>
        <Button variant="ghost" aria-label="Đóng" onClick={onClose}>
          <X size={20} />
        </Button>
      </div>
      {children}
    </dialog>
  );
}
export function LinkButton({
  to,
  children,
  secondary = false,
}: {
  to: string;
  children: ReactNode;
  secondary?: boolean;
}) {
  return (
    <Link className={s.button + ' ' + (secondary ? s.secondary : s.primary)} to={to}>
      {children}
      <ArrowRight size={17} />
    </Link>
  );
}

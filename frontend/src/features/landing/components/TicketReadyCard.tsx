import { Check, QrCode } from 'lucide-react';
import { Badge } from '@/components/ui/Ui';
import s from './Hero.module.css';
export function TicketReadyCard() {
  return (
    <div className={s.ticketCard} data-hero-card aria-label="Minh họa vé demo">
      <span className={s.qrIcon}>
        <QrCode size={27} />
      </span>
      <div>
        <strong>Vé của bạn đã sẵn sàng</strong>
        <small>
          Quét QR và lên xe thật dễ dàng <Badge>Demo</Badge>
        </small>
      </div>
      <Check size={23} className={s.check} />
    </div>
  );
}

import bus from '@/assets/images/tambus-hero.webp';
import { ArrivalCard } from './ArrivalCard';
import { TicketReadyCard } from './TicketReadyCard';
import s from './Hero.module.css';
export function HeroBusVisual() {
  return (
    <div className={s.visual}>
      <div className={s.visualLabel}>
        <span className={s.dot} />
        CHUYẾN ĐI THÔNG MINH
      </div>
      <div className={s.busFrame} data-hero-bus>
        <img
          className={s.bus}
          src={bus}
          width={1672}
          height={941}
          fetchPriority="high"
          alt="Xe buýt TAMBUS xanh lá, logo T, biển số 20T-000.00, bảng điện tử 01 - SMARTBUS"
        />
      </div>
      <ArrivalCard />
      <TicketReadyCard />
    </div>
  );
}

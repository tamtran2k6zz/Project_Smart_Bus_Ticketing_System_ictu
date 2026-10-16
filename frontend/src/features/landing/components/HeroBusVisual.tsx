import bus from '@/assets/images/tambus-hero.webp?responsive';
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
          src={bus.src}
          srcSet={bus.srcSet}
          sizes="(max-width: 900px) calc(100vw - 32px), 58vw"
          width={1672}
          height={941}
          fetchPriority="high"
          decoding="async"
          alt="Xe buýt TAMBUS xanh lá, logo T, biển số 20T-000.00, bảng điện tử 01 - SMARTBUS"
        />
      </div>
      <ArrivalCard />
      <TicketReadyCard />
    </div>
  );
}

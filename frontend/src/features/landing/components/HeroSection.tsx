import { useRef } from 'react';
import { Check, Leaf } from 'lucide-react';
import { LinkButton } from '@/components/ui/Ui';
import { HeroBusVisual } from './HeroBusVisual';
import { useHeroAnimation } from '../hooks/useHeroAnimation';
import s from './Hero.module.css';
export function HeroSection() {
  const root = useRef<HTMLElement>(null);
  useHeroAnimation(root);
  return (
    <section className={s.hero} ref={root}>
      <div className={s.heroGrid}>
        <div className={s.content}>
          <div className={s.pill} data-hero-badge>
            <Leaf size={19} />
            Hành trình xanh. Trải nghiệm thông minh.
          </div>
          <h1 data-hero-title aria-label="Đi xe buýt dễ dàng hơn cùng SmartBus">
            Đi xe buýt
            <br />
            dễ dàng hơn cùng
            <br />
            <span>SmartBus.</span>
          </h1>
          <p data-hero-copy>
            Đặt vé trực tuyến, lên xe bằng QR và theo dõi hành trình.
            <br className={s.desktopBreak} /> Một trải nghiệm liền mạch, từ điểm đi đến điểm đến.
          </p>
          <div className={s.actions} data-hero-cta>
            <LinkButton to="/trips">Tra cứu chuyến xe</LinkButton>
            <LinkButton to="/tracking/t1" secondary>
              Theo dõi xe
            </LinkButton>
          </div>
          <div className={s.notes} data-hero-benefits>
            {['Dễ sử dụng', 'Vé điện tử tiện lợi', 'Thông tin rõ ràng'].map(text => (
              <span key={text}>
                <Check size={18} />
                {text}
              </span>
            ))}
          </div>
        </div>
        <HeroBusVisual />
      </div>
    </section>
  );
}

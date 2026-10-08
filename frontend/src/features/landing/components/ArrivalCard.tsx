import s from './Hero.module.css';
export function ArrivalCard() {
  return (
    <div className={s.arrivalCard} data-hero-card aria-label="Minh họa ETA demo">
      <span className={s.dot} aria-hidden="true" />
      <strong>Xe đến trong 5 phút</strong>
      <small>Mô phỏng theo dõi tuyến 01</small>
    </div>
  );
}

import { Outlet } from 'react-router-dom';
import bus from '@/assets/images/tambus-hero.webp';
import { Header } from './MainLayout';
import s from './Layout.module.css';
export default function AuthLayout() {
  return (
    <div className={s.authLayout}>
      <Header showDemoNotice={false} />
      <main id="main" tabIndex={-1} className={s.auth}>
        <div className={s.authBrand}>
          <h1>
            Mỗi ngày một hành trình.
            <br />
            Mỗi chuyến một kết nối.
          </h1>
          <p>Đồng hành cùng SmartBus để di chuyển dễ dàng hơn.</p>
          <div className={s.authBusVisual}>
            <img
              className={s.authBus}
              src={bus}
              width={1672}
              height={941}
              fetchPriority="high"
              alt="Xe buýt TAMBUS xanh lá, bảng điện tử 01 - SMARTBUS"
            />
          </div>
        </div>
        <div className={s.authContent}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}

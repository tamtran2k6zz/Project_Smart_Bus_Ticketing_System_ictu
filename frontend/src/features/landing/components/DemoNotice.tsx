import { appConfig } from '@/configs/app.config';
import s from './Hero.module.css';
export function DemoNotice() {
  return appConfig.demo ? (
    <div className={s.demoNotice}>
      Chế độ demo · Thanh toán, vị trí xe và xác thực vé được mô phỏng
    </div>
  ) : null;
}

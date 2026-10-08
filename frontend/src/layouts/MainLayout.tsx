import { Outlet, Link } from 'react-router-dom';
import { useState } from 'react';
import { Button, Logo, Modal } from '@/components/ui/Ui';
import { Header } from '@/components/navigation/Header';
import s from './Layout.module.css';
export { Header } from '@/components/navigation/Header';
export function Footer() {
  const [policy, setPolicy] = useState('');
  return (
    <footer className={s.footer}>
      <div className="container">
        <div className={s.footerGrid}>
          <div>
            <Logo />
            <p className="muted">
              Hệ thống số hóa bán vé và quản lý xe buýt thông minh.
              <br />
              Kết nối mỗi hành trình, hướng tới di chuyển xanh.
            </p>
          </div>
          <div>
            <h3>KHÁM PHÁ SMARTBUS</h3>
            <ul>
              <li>
                <Link to="/trips">Tra cứu chuyến xe</Link>
              </li>
              <li>
                <Link to="/account/tickets">Vé của tôi</Link>
              </li>
              <li>
                <Link to="/account/passes">Vé tháng & ưu đãi</Link>
              </li>
            </ul>
          </div>
          <div>
            <h3>HỖ TRỢ & THÔNG TIN</h3>
            <ul>
              <li>
                <Link to="/account/support">Liên hệ & phản ánh</Link>
              </li>
              <li>
                <Button variant="ghost" onClick={() => setPolicy('Điều khoản sử dụng')}>
                  Điều khoản sử dụng
                </Button>
              </li>
              <li>
                <Button variant="ghost" onClick={() => setPolicy('Chính sách dữ liệu demo')}>
                  Chính sách dữ liệu
                </Button>
              </li>
            </ul>
          </div>
        </div>
        <div className={s.footerBottom}>
          <span>© 2026 SmartBus · Dự án thực tập cơ sở ICTU</span>
          <span>Tiếng Việt · VND · Asia/Ho_Chi_Minh</span>
        </div>
      </div>
      <Modal open={!!policy} onClose={() => setPolicy('')} title={policy}>
        <p className="muted">
          Ứng dụng hiện phục vụ trải nghiệm demo. Không thực hiện giao dịch thật. Dữ liệu demo được
          lưu trong trình duyệt trên thiết bị của bạn; không nhập thông tin nhạy cảm. Bạn có thể xóa
          dữ liệu bằng cách xóa bộ nhớ trang.
        </p>
        <p className="muted">
          Chính sách demo: yêu cầu hủy/đổi trước giờ khởi hành 30 phút; đổi sang chuyến cùng tuyến,
          cùng loại vé nếu còn chỗ. Hoàn tiền cần điều hành duyệt và tài chính xác nhận. Chứng từ
          tải xuống là tài liệu mô phỏng.
        </p>
        <Button onClick={() => setPolicy('')}>Đã hiểu</Button>
      </Modal>
    </footer>
  );
}
export default function MainLayout() {
  return (
    <>
      <Header />
      <main id="main">
        <Outlet />
      </main>
      <Footer />
    </>
  );
}

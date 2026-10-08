import { Ticket, CreditCard, Bell, MessageSquare, User, Search } from 'lucide-react';
import { PortalShell } from './PortalShell';
export default function PassengerLayout() {
  return (
    <PortalShell
      title="KHÔNG GIAN HÀNH KHÁCH"
      items={[
        { to: '/trips', label: 'Tra cứu chuyến', icon: Search },
        { to: '/account/tickets', label: 'Vé của tôi', icon: Ticket },
        { to: '/account/passes', label: 'Vé tháng & ưu đãi', icon: CreditCard },
        { to: '/account/notifications', label: 'Thông báo', icon: Bell },
        { to: '/account/support', label: 'Hỗ trợ & phản ánh', icon: MessageSquare },
        { to: '/account/profile', label: 'Hồ sơ tài khoản', icon: User },
      ]}
    />
  );
}

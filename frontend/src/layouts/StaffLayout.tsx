import { CalendarDays, ScanLine, TriangleAlert } from 'lucide-react';
import { PortalShell } from './PortalShell';
export default function StaffLayout() {
  return (
    <PortalShell
      title="KHÔNG GIAN NHÂN VIÊN"
      items={[
        { to: '/staff/trips', label: 'Chuyến được phân công', icon: CalendarDays },
        { to: '/staff/scan', label: 'Soát vé QR', icon: ScanLine },
        { to: '/staff/incidents', label: 'Sự cố hành trình', icon: TriangleAlert },
      ]}
    />
  );
}

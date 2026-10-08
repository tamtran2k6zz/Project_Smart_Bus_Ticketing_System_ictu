import {
  LayoutDashboard,
  Route,
  MapPin,
  CalendarDays,
  BusFront,
  Users,
  ClipboardList,
  BarChart3,
  Tags,
  ShieldCheck,
  ScrollText,
  MessageSquare,
  BadgeCheck,
} from 'lucide-react';
import { PortalShell } from './PortalShell';
import { can } from '@/configs/permissions';
import { useSession } from '@/store/session.store';
import type { Permission } from '@/features/auth/types';
export const adminNavigation = [
  { to: '/admin', label: 'Tổng quan', icon: LayoutDashboard },
  { to: '/admin/routes', label: 'Tuyến & giá vé', icon: Route, permission: 'operations' },
  { to: '/admin/stops', label: 'Trạm dừng', icon: MapPin, permission: 'operations' },
  { to: '/admin/schedules', label: 'Lịch chạy', icon: CalendarDays, permission: 'operations' },
  { to: '/admin/vehicles', label: 'Đội xe', icon: BusFront, permission: 'operations' },
  { to: '/admin/staff', label: 'Nhân sự', icon: Users, permission: 'operations' },
  {
    to: '/admin/assignments',
    label: 'Phân công chuyến',
    icon: ClipboardList,
    permission: 'operations',
  },
  { to: '/admin/reports', label: 'Báo cáo & hoàn tiền', icon: BarChart3, permission: 'reports' },
  { to: '/admin/promotions', label: 'Voucher', icon: Tags, permission: 'promotions' },
  { to: '/admin/eligibility', label: 'Duyệt ưu đãi', icon: BadgeCheck, permission: 'eligibility' },
  { to: '/admin/users', label: 'Tài khoản & quyền', icon: ShieldCheck, permission: 'users' },
  { to: '/admin/audit-logs', label: 'Nhật ký', icon: ScrollText, permission: 'audit' },
  {
    to: '/admin/support',
    label: 'Hỗ trợ & yêu cầu vé',
    icon: MessageSquare,
    permission: 'support',
  },
];
export default function AdminLayout() {
  const user = useSession(state => state.user);
  return (
    <PortalShell
      title="ĐIỀU HÀNH & QUẢN TRỊ"
      items={adminNavigation.filter(
        item => !item.permission || can(user, item.permission as Permission)
      )}
    />
  );
}

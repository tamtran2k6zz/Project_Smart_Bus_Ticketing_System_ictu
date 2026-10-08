import { NavLink, Outlet } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { useSession } from '@/store/session.store';
import { roleLabels } from '@/configs/permissions';
import { Header } from './MainLayout';
import s from './Layout.module.css';
export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}
export function PortalShell({ title, items }: { title: string; items: NavItem[] }) {
  const user = useSession(state => state.user);
  return (
    <>
      <Header />
      <div className={s.shell}>
        <aside className={s.sidebar}>
          <p className={s.sidebarTitle}>{title}</p>
          <nav aria-label={title}>
            {items.map(({ to, label, icon: Icon }) => (
              <NavLink to={to} end={to === '/admin'} key={to}>
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className={s.sidebarUser}>
            <span className={s.avatar}>{user?.name.charAt(0)}</span>
            <div>
              <strong>{user?.name}</strong>
              <small>{user && roleLabels[user.role]}</small>
            </div>
          </div>
        </aside>
        <main id="main" className={s.content}>
          <Outlet />
        </main>
      </div>
    </>
  );
}

import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, Bell } from 'lucide-react';
import { useEffect } from 'react';
import { Button, Logo, LinkButton } from '@/components/ui/Ui';
import { useSession } from '@/store/session.store';
import { useUi } from '@/store/ui.store';
import { queryClient } from '@/services/queryClient';
import { authApi } from '@/features/auth/services/auth.api';
import { roleLabels } from '@/configs/permissions';
import { DemoNotice } from '@/features/landing/components/DemoNotice';
import s from './Header.module.css';
export function Header({ showDemoNotice = true }: { showDemoNotice?: boolean }) {
  const user = useSession(state => state.user),
    setUser = useSession(state => state.setUser);
  const { menuOpen, setMenu } = useUi();
  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenu(false);
        document.getElementById('smartbus-menu-toggle')?.focus();
      }
    };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [menuOpen, setMenu]);
  const location = useLocation(),
    navigate = useNavigate();
  useEffect(() => {
    setMenu(false);
  }, [location.pathname, setMenu]);
  useEffect(() => {
    if (!user) return;
    let alive = true;
    authApi
      .session(user.id)
      .then(fresh => {
        if (alive && JSON.stringify(fresh) !== JSON.stringify(user)) setUser(fresh);
      })
      .catch(() => {
        if (alive) setUser(null);
      });
    return () => {
      alive = false;
    };
  }, [location.pathname, user, setUser]);
  return (
    <>
      <header className={s.header}>
        <div className={s.headerInner}>
          <Logo />
          <nav
            id="smartbus-navigation"
            className={s.nav + ' ' + (menuOpen ? s.open : '')}
            aria-label="Điều hướng chính"
          >
            {user && (
              <Link
                className={s.mobileRole}
                to={
                  user.role === 'PASSENGER'
                    ? '/account/tickets'
                    : user.role === 'DRIVER'
                      ? '/staff/trips'
                      : '/admin'
                }
              >
                Cổng {roleLabels[user.role]}
              </Link>
            )}
            {[
              ['features', 'Tính năng'],
              ['how-it-works', 'Cách sử dụng'],
              ['operators', 'Nhà xe'],
              ['faq', 'FAQ'],
            ].map(([id, label]) => (
              <a href={'/#' + id} key={id} onClick={() => setMenu(false)}>
                {label}
              </a>
            ))}
            <Link className={s.mobileSearch} to="/trips" onClick={() => setMenu(false)}>
              Tra cứu chuyến →
            </Link>
          </nav>
          <div className={s.headerActions}>
            {user ? (
              <>
                <Link
                  className={s.login + ' ' + s.roleLink}
                  to={
                    user.role === 'PASSENGER'
                      ? '/account/tickets'
                      : user.role === 'DRIVER'
                        ? '/staff/trips'
                        : '/admin'
                  }
                >
                  {roleLabels[user.role]}
                </Link>
                <Link to="/account/notifications" aria-label="Thông báo">
                  <Bell size={18} />
                </Link>
                <Button
                  variant="ghost"
                  aria-label="Đăng xuất"
                  onClick={async () => {
                    await authApi.logout();
                    setUser(null);
                    queryClient.clear();
                    navigate('/');
                  }}
                >
                  <LogOut size={17} />
                </Button>
              </>
            ) : (
              <Link className={s.login} to="/login">
                Đăng nhập
              </Link>
            )}
            <LinkButton to="/trips">Tra cứu chuyến</LinkButton>
            <Button
              variant="ghost"
              id="smartbus-menu-toggle"
              className={s.menuButton}
              aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}
              aria-controls="smartbus-navigation"
              aria-expanded={menuOpen}
              onClick={() => setMenu(!menuOpen)}
            >
              {menuOpen ? <X size={21} /> : <Menu size={21} />}
            </Button>
          </div>
        </div>
      </header>
      {showDemoNotice && <DemoNotice />}
    </>
  );
}

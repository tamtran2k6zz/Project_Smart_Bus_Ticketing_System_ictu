import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { HeroBusScene, RouteMapScene } from './Scenes';
import { useTheme, type ThemePreference } from './theme';

type IconName =
  | 'sun'
  | 'moon'
  | 'monitor'
  | 'menu'
  | 'close'
  | 'bus'
  | 'arrow'
  | 'search'
  | 'ticket'
  | 'route'
  | 'shield'
  | 'check';
const iconPaths: Record<IconName, ReactNode> = {
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
    </>
  ),
  moon: <path d="M20.8 13A9 9 0 0 1 11 3.2 9 9 0 1 0 20.8 13Z" />,
  monitor: (
    <>
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="M8 21h8m-4-4v4" />
    </>
  ),
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  bus: (
    <>
      <rect x="4" y="3" width="16" height="17" rx="4" />
      <path d="M4 12h16M8 3v9m8-9v9M7 20v2m10-2v2M8 16h.01M16 16h.01" />
    </>
  ),
  arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 5 5" />
    </>
  ),
  ticket: (
    <>
      <path d="M3 7h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4V7Z" />
      <path d="M15 7v2m0 3v2m0 3v2" />
    </>
  ),
  route: (
    <>
      <circle cx="6" cy="5" r="2" />
      <circle cx="18" cy="19" r="2" />
      <path d="M6 7v7a4 4 0 0 0 4 4h6M8 5h6a4 4 0 0 1 0 8h-4" />
    </>
  ),
  shield: (
    <>
      <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
};

function Icon({ name, className = '' }: { name: IconName; className?: string }) {
  return (
    <svg
      className={`icon ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {iconPaths[name]}
    </svg>
  );
}

const sections = [
  { id: 'hero', label: 'Trang chủ' },
  { id: 'routes', label: 'Tuyến xe' },
  { id: 'capabilities', label: 'Tính năng' },
  { id: 'tickets', label: 'Vé điện tử' },
  { id: 'operations', label: 'Điều hành' },
];
const themeOptions: {
  value: ThemePreference;
  label: string;
  icon: IconName;
  description: string;
}[] = [
  { value: 'light', label: 'Sáng', icon: 'sun', description: 'Nền sáng, dễ đọc ban ngày' },
  { value: 'dark', label: 'Tối', icon: 'moon', description: 'Nền tối, dịu mắt ban đêm' },
  {
    value: 'system',
    label: 'Theo hệ thống',
    icon: 'monitor',
    description: 'Đồng bộ với giao diện thiết bị',
  },
];

function Navbar({ activeSection }: { activeSection: string }) {
  const { preference, setPreference } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const themeButton = useRef<HTMLButtonElement>(null);
  const themeMenu = useRef<HTMLDivElement>(null);
  const header = useRef<HTMLElement>(null);
  const selectedTheme = themeOptions.find(option => option.value === preference)!;

  useEffect(() => {
    if (themeOpen)
      themeMenu.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus();
  }, [themeOpen]);

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (!header.current?.contains(event.target as Node)) {
        setMenuOpen(false);
        setThemeOpen(false);
      }
    };
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (themeOpen) themeButton.current?.focus();
      else if (menuOpen) menuButton.current?.focus();
      setThemeOpen(false);
      setMenuOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuOpen, themeOpen]);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1200px)');
    const closeMobileMenu = () => {
      if (desktop.matches) setMenuOpen(false);
    };
    desktop.addEventListener('change', closeMobileMenu);
    return () => desktop.removeEventListener('change', closeMobileMenu);
  }, []);

  function handleThemeKeys(event: KeyboardEvent<HTMLDivElement>) {
    const buttons = Array.from(themeMenu.current?.querySelectorAll('button') ?? []);
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    let next: number;
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight')
      next = (index + 1) % buttons.length;
    else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft')
      next = (index - 1 + buttons.length) % buttons.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = buttons.length - 1;
    else if (event.key === 'Tab') {
      themeButton.current?.focus();
      setThemeOpen(false);
      return;
    } else return;
    event.preventDefault();
    buttons[next]?.focus();
  }

  const navLinks = sections.map(section => (
    <a
      key={section.id}
      href={`#${section.id}`}
      aria-current={activeSection === section.id ? 'location' : undefined}
      onClick={() => setMenuOpen(false)}
    >
      {section.label}
    </a>
  ));

  return (
    <header className="site-header" ref={header}>
      <div className="header-bar glass">
        <a className="brand" href="#hero" aria-label="SmartBus — về đầu trang">
          <span className="brand-icon">
            <Icon name="bus" />
          </span>
          <span>
            SmartBus<span className="brand-caption">Đi xe buýt thông minh</span>
          </span>
        </a>
        <nav className="desktop-nav" aria-label="Các phần của trang">
          {navLinks}
        </nav>
        <div className="header-actions">
          <a className="header-login button button-quiet" href="/login">
            Đăng nhập
          </a>
          <div className="theme-control">
            <button
              ref={themeButton}
              className="button button-icon"
              type="button"
              aria-label={`Đổi giao diện, đang ${selectedTheme.label.toLowerCase()}`}
              title={`Giao diện: ${selectedTheme.label}`}
              aria-haspopup="menu"
              aria-expanded={themeOpen}
              aria-controls="theme-menu"
              onClick={() => {
                setThemeOpen(!themeOpen);
                setMenuOpen(false);
              }}
            >
              <Icon name={selectedTheme.icon} />
            </button>
            {themeOpen && (
              <div
                id="theme-menu"
                className="theme-menu glass"
                role="menu"
                aria-label="Chọn giao diện"
                ref={themeMenu}
                onKeyDown={handleThemeKeys}
              >
                <div className="menu-heading">Giao diện</div>
                {themeOptions.map(option => (
                  <button
                    key={option.value}
                    role="menuitemradio"
                    aria-checked={preference === option.value}
                    type="button"
                    onClick={() => {
                      setPreference(option.value);
                      setThemeOpen(false);
                      themeButton.current?.focus();
                    }}
                  >
                    <Icon name={option.icon} />
                    <span>
                      <span className="theme-option-label">{option.label}</span>
                      <span className="theme-option-description">{option.description}</span>
                    </span>
                    {preference === option.value && <Icon name="check" className="theme-check" />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            ref={menuButton}
            className="button button-icon mobile-menu-button"
            type="button"
            aria-label={menuOpen ? 'Đóng menu điều hướng' : 'Mở menu điều hướng'}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            onClick={() => {
              setMenuOpen(!menuOpen);
              setThemeOpen(false);
            }}
          >
            <Icon name={menuOpen ? 'close' : 'menu'} />
          </button>
        </div>
      </div>
      {menuOpen && (
        <nav id="mobile-nav" className="mobile-nav glass" aria-label="Điều hướng trên điện thoại">
          {navLinks}
          <div className="mobile-auth">
            <a className="button button-secondary" href="/login">
              Đăng nhập
            </a>
            <a className="button button-primary" href="/register">
              Đăng ký tài khoản
            </a>
          </div>
        </nav>
      )}
    </header>
  );
}

function HeroSection() {
  return (
    <section id="hero" className="hero section">
      <HeroBusScene />
      <div className="hero-content container">
        <span className="eyebrow">
          <span className="status-dot" />
          SmartBus · Di chuyển thuận tiện mỗi ngày
        </span>
        <h1 className="hero-title">
          <span>Di chuyển thông minh</span>
          <span>Chạm là lên xe</span>
        </h1>
        <p className="hero-description">
          Tra cứu tuyến xe, chọn chỗ ngồi và đặt vé trực tuyến. Mang theo vé điện tử QR để lên xe
          thuận tiện, không cần giữ vé giấy.
        </p>
        <div className="hero-actions">
          <a className="button button-primary" href="/">
            <Icon name="search" />
            Tìm chuyến xe
            <Icon name="arrow" />
          </a>
          <a className="button button-secondary" href="#tickets">
            Xem cách đặt vé
          </a>
        </div>
        <div className="hero-stats">
          <div className="stat-card glass">
            <Icon name="ticket" />
            <strong>Vé điện tử QR</strong>
            <span>Vé của bạn, luôn trong tầm tay</span>
          </div>
          <div className="stat-card glass">
            <Icon name="route" />
            <strong>Đặt vé online</strong>
            <span>Chọn chuyến và chỗ ngồi phù hợp</span>
          </div>
        </div>
        <a href="#routes" className="hero-scroll">
          Khám phá các tuyến xe <span aria-hidden="true">↓</span>
        </a>
      </div>
    </section>
  );
}

const exampleRoutes = [
  {
    code: 'TUYEN-01',
    name: 'Bến xe Thái Nguyên → ĐH CNTT & TT',
    distance: '15,2 km',
    time: '~35 phút',
    fare: '10.000 đ',
    stops: [
      'Bến xe Trung tâm TP Thái Nguyên',
      'Đại học Sư phạm Thái Nguyên',
      'Bệnh viện Đa khoa TW Thái Nguyên',
      'Đại học CNTT & TT (ICTU)',
    ],
  },
  {
    code: 'TUYEN-02',
    name: 'Bến xe Phổ Yên → Gang Thép Thái Nguyên',
    distance: '22,5 km',
    time: '~45 phút',
    fare: '12.000 đ',
    stops: [
      'Bến xe Phổ Yên Thái Nguyên',
      'Ngã ba Ba Hàng',
      'Khu công nghiệp Sông Công',
      'Khu Gang Thép Thái Nguyên',
    ],
  },
];

function RoutesSection() {
  return (
    <section id="routes" className="section section-tinted" aria-labelledby="routes-heading">
      <div className="container">
        <div className="section-heading">
          <span className="eyebrow">Kết nối những điểm đến quen thuộc</span>
          <h2 id="routes-heading">Tuyến xe và trạm dừng</h2>
          <p>
            Tham khảo một số hành trình tại Thái Nguyên. Tra cứu chuyến xe để xem lịch chạy và giá
            vé hiện tại.
          </p>
        </div>
        <div className="route-grid">
          {exampleRoutes.map(route => (
            <article className="route-card glass" key={route.code}>
              <div className="card-meta">
                <span className="route-code">{route.code}</span>
                <span className="badge">Tuyến minh họa</span>
              </div>
              <h3>{route.name}</h3>
              <dl className="route-facts">
                <div>
                  <dt>Cự ly</dt>
                  <dd>{route.distance}</dd>
                </div>
                <div>
                  <dt>Thời gian</dt>
                  <dd>{route.time}</dd>
                </div>
                <div>
                  <dt>Giá tham khảo</dt>
                  <dd>{route.fare}</dd>
                </div>
              </dl>
              <ol className="stop-list">
                {route.stops.map((stop, index) => (
                  <li key={stop}>
                    <span aria-hidden="true">{index + 1}</span>
                    {stop}
                  </li>
                ))}
              </ol>
              <a href="/" className="button button-secondary route-action">
                Tra cứu tuyến xe
                <Icon name="arrow" />
              </a>
            </article>
          ))}
        </div>
        <p className="section-note">
          Thông tin trên các thẻ dùng để minh họa hành trình, không phải lịch chạy hoặc giá vé đang
          được cập nhật trực tiếp.
        </p>
      </div>
    </section>
  );
}

const features: { title: string; description: string; icon: IconName; tags: string[] }[] = [
  {
    title: 'Vé điện tử trong tầm tay',
    description:
      'Chọn chuyến, đặt chỗ và mở mã QR trên điện thoại khi lên xe. Bạn có thể xem lại vé và lịch sử đặt vé trong tài khoản.',
    icon: 'ticket',
    tags: ['Vé QR', 'Chọn chỗ ngồi', 'Lịch sử đặt vé'],
  },
  {
    title: 'Tra cứu hành trình dễ dàng',
    description:
      'Xem tuyến xe và các trạm dừng để lựa chọn hành trình phù hợp với điểm đi, điểm đến của bạn.',
    icon: 'route',
    tags: ['Tuyến xe', 'Trạm dừng', 'Tìm chuyến'],
  },
  {
    title: 'Phân quyền theo vai trò',
    description:
      'Hành khách, tài xế và đội ngũ vận hành có cổng làm việc riêng, với những chức năng phù hợp cho từng nhiệm vụ.',
    icon: 'shield',
    tags: ['Hành khách', 'Tài xế', 'Đội ngũ vận hành'],
  },
];

function CapabilitiesSection({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <section id="capabilities" className="section capabilities" aria-labelledby="features-heading">
      <RouteMapScene reducedMotion={reducedMotion} />
      <div className="container section-content">
        <div className="section-heading">
          <span className="eyebrow">Đơn giản hơn trong mỗi chuyến đi</span>
          <h2 id="features-heading">Những tiện ích của SmartBus</h2>
          <p>
            Từ tìm chuyến đến xuất trình vé, những thông tin cần thiết được sắp xếp rõ ràng để bạn
            dễ sử dụng.
          </p>
        </div>
        <div className="feature-grid">
          {features.map(feature => (
            <article className="feature-card glass" key={feature.title}>
              <span className="feature-icon">
                <Icon name={feature.icon} />
              </span>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
              <div className="feature-tags">
                {feature.tags.map(tag => (
                  <span className="badge" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ExampleQr() {
  return (
    <svg
      className="example-qr"
      viewBox="0 0 100 100"
      role="img"
      aria-label="Mã QR minh họa, không dùng để lên xe"
    >
      <rect width="100" height="100" fill="white" />
      <g fill="black">
        <path d="M5 5h25v25H5zM70 5h25v25H70zM5 70h25v25H5z" />
        <path d="M35 10h8v8h-8zM48 10h8v8h-8zM35 25h12v6H35zM50 25h6v12h-6zM40 45h20v10H40zM15 40h10v10H15zM70 40h15v8H70zM35 70h10v15H35zM55 70h15v10H55zM75 75h15v15H75z" />
      </g>
      <g fill="white">
        <path d="M9 9h17v17H9zM74 9h17v17H74zM9 74h17v17H9z" />
      </g>
      <g fill="black">
        <path d="M13 13h9v9h-9zM78 13h9v9h-9zM13 78h9v9h-9z" />
      </g>
    </svg>
  );
}

function TicketsSection() {
  return (
    <section id="tickets" className="section section-tinted" aria-labelledby="tickets-heading">
      <div className="container">
        <div className="section-heading">
          <span className="eyebrow">Từ đặt vé đến lên xe</span>
          <h2 id="tickets-heading">Vé xe buýt ngay trên điện thoại</h2>
          <p>
            Không cần giữ vé giấy. Mở vé điện tử của bạn và xuất trình mã QR cho tài xế khi lên xe.
          </p>
        </div>
        <ol className="booking-steps">
          <li>
            <span>1</span>
            <div>
              <strong>Tìm chuyến xe</strong>
              <p>Chọn điểm đi, điểm đến và ngày đi.</p>
            </div>
          </li>
          <li>
            <span>2</span>
            <div>
              <strong>Đặt vé và thanh toán</strong>
              <p>Chọn chỗ ngồi và hoàn tất đặt vé.</p>
            </div>
          </li>
          <li>
            <span>3</span>
            <div>
              <strong>Xuất trình vé QR</strong>
              <p>Mở vé trong tài khoản khi lên xe.</p>
            </div>
          </li>
        </ol>
        <div className="ticket-preview glass">
          <div className="ticket-details">
            <div className="ticket-brand">
              <span className="brand-icon">
                <Icon name="bus" />
              </span>
              <div>
                <strong>SmartBus · Vé xe buýt</strong>
                <span className="muted">Vé minh họa</span>
              </div>
            </div>
            <dl className="ticket-fields">
              <div>
                <dt>Hành khách</dt>
                <dd>Hành khách mẫu</dd>
              </div>
              <div>
                <dt>Tuyến xe</dt>
                <dd>TUYEN-01 · ICTU</dd>
              </div>
              <div>
                <dt>Trạm lên</dt>
                <dd>Bến xe Thái Nguyên</dd>
              </div>
              <div>
                <dt>Trạm xuống</dt>
                <dd>ĐH CNTT & TT</dd>
              </div>
              <div>
                <dt>Chỗ ngồi</dt>
                <dd>12A · Cửa sổ</dd>
              </div>
              <div>
                <dt>Giá tham khảo</dt>
                <dd>10.000 đ</dd>
              </div>
            </dl>
            <p className="ticket-note">Thông tin và mã QR này chỉ minh họa giao diện vé.</p>
          </div>
          <div className="ticket-qr">
            <ExampleQr />
            <span>QR minh họa</span>
          </div>
        </div>
        <div className="section-actions">
          <a href="/passenger/booking" className="button button-primary">
            Đặt vé và chọn chỗ
            <Icon name="arrow" />
          </a>
          <a href="/login" className="button button-secondary">
            Xem vé của tôi
          </a>
        </div>
      </div>
    </section>
  );
}

const roles = [
  {
    id: 'admin',
    tag: 'QUẢN TRỊ',
    title: 'Quản trị viên',
    description: 'Quản lý tuyến, trạm dừng, người dùng và các thiết lập của hệ thống.',
    link: '/admin/routes',
    action: 'Cổng quản trị',
  },
  {
    id: 'manager',
    tag: 'ĐIỀU ĐỘ',
    title: 'Quản lý điều độ',
    description: 'Theo dõi và điều phối hoạt động tuyến xe theo quyền được cấp.',
    link: '/admin/routes',
    action: 'Cổng điều độ',
  },
  {
    id: 'driver',
    tag: 'TÀI XẾ',
    title: 'Tài xế xe buýt',
    description: 'Xem chuyến được phân công, soát vé QR và gửi báo cáo sự cố.',
    link: '/driver/portal',
    action: 'Cổng tài xế',
  },
  {
    id: 'passenger',
    tag: 'HÀNH KHÁCH',
    title: 'Hành khách',
    description: 'Tìm chuyến, chọn chỗ ngồi, đặt vé và xem lại vé trong tài khoản.',
    link: '/passenger/booking',
    action: 'Cổng hành khách',
  },
];

function OperationsSection() {
  return (
    <section id="operations" className="section" aria-labelledby="operations-heading">
      <div className="container">
        <div className="section-heading">
          <span className="eyebrow">Cổng làm việc theo vai trò</span>
          <h2 id="operations-heading">Kết nối hành khách và đội ngũ vận hành</h2>
          <p>
            Chọn cổng phù hợp và đăng nhập bằng tài khoản của bạn. Các chức năng hiển thị theo quyền
            được cấp.
          </p>
        </div>
        <div className="role-grid">
          {roles.map(role => (
            <article className="role-card glass" key={role.id}>
              <span className="role-label" data-role={role.id}>
                <span />
                {role.tag}
              </span>
              <h3>{role.title}</h3>
              <p>{role.description}</p>
              <a className="button button-secondary" href={role.link}>
                {role.action}
                <Icon name="arrow" />
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  const [activeSection, setActiveSection] = useState('hero');
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const updateActiveSection = () => {
      const current = [...sections].reverse().find(section => {
        const element = document.getElementById(section.id);
        return element && element.getBoundingClientRect().top <= 140;
      });
      setActiveSection(current?.id ?? 'hero');
    };
    updateActiveSection();
    window.addEventListener('scroll', updateActiveSection, { passive: true });
    window.addEventListener('resize', updateActiveSection);
    return () => {
      window.removeEventListener('scroll', updateActiveSection);
      window.removeEventListener('resize', updateActiveSection);
    };
  }, []);

  return (
    <>
      <a href="#main-content" className="skip-link">
        Bỏ qua điều hướng
      </a>
      <Navbar activeSection={activeSection} />
      <main id="main-content" tabIndex={-1}>
        <HeroSection />
        <RoutesSection />
        <CapabilitiesSection reducedMotion={reducedMotion} />
        <TicketsSection />
        <OperationsSection />
      </main>
      <footer className="site-footer">
        <div className="container">
          <a href="#hero" className="footer-brand">
            <Icon name="bus" />
            SmartBus
          </a>
          <p>Hệ thống vé xe buýt thông minh · Nhóm 5, ICTU · 2026</p>
          <a href="/register" className="footer-link">
            Đăng ký tài khoản
          </a>
        </div>
      </footer>
    </>
  );
}

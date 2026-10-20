import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { operationsApi } from '@/features/operations/services/operations.api';
import { appConfig } from '@/configs/app.config';
import { animate, onScroll, stagger } from 'animejs';
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  CreditCard,
  MapPin,
  QrCode,
  Ticket,
  Bell,
  Leaf,
  Route,
  CalendarCheck,
  ShieldCheck,
  BarChart3,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { HeroSection } from './HeroSection';
import { SearchForm } from '@/features/booking/components/SearchForm';
import { Badge, LinkButton } from '@/components/ui/Ui';
import { useAnimeScope } from '@/hooks/useAnimeScope';
import s from './Landing.module.css';
const benefits = [
  {
    icon: Ticket,
    title: 'Đặt vé trong vài chạm',
    text: 'Tìm chuyến phù hợp, chọn chỗ và đặt vé ngay trên điện thoại.',
  },
  {
    icon: CreditCard,
    title: 'Thanh toán thuận tiện',
    text: 'Lựa chọn phương thức thanh toán quen thuộc, theo dõi trạng thái rõ ràng.',
  },
  {
    icon: QrCode,
    title: 'Lên xe bằng mã QR',
    text: 'Vé điện tử luôn bên bạn. Mở mã QR, quét vé và bắt đầu hành trình.',
  },
  {
    icon: MapPin,
    title: 'Biết xe đang ở đâu',
    text: 'Theo dõi hành trình, thời gian dự kiến và cập nhật từ nhà xe.',
  },
];
const faqs = [
  [
    'Tôi có thể thanh toán bằng cách nào?',
    appConfig.demo
      ? 'Bản demo mô phỏng thanh toán, không thu tiền thật.'
      : 'Bạn có thể thanh toán bằng VNPay, chuyển khoản Techcombank hoặc ví SmartBus khi phương thức tương ứng khả dụng. Vé chỉ phát hành sau khi giao dịch được xác nhận.',
  ],
  [
    'Tôi cần làm gì khi lên xe?',
    'Mở Vé của tôi, chọn vé và trình QR cho phụ xe. QR chỉ được cấp sau khi dịch vụ xác nhận đặt vé đã thanh toán.',
  ],
  [
    'Tôi có thể hủy hoặc đổi vé không?',
    'Gửi yêu cầu trong chi tiết vé trước giờ khởi hành ít nhất 30 phút. Điều hành duyệt yêu cầu; khoản hoàn có trạng thái riêng.',
  ],
  [
    'Vị trí xe được cập nhật như thế nào?',
    appConfig.demo
      ? 'Bản demo mô phỏng vị trí xe và ETA.'
      : 'Vị trí do tài xế được phân công chia sẻ từ thiết bị. Màn hình hiển thị thời điểm cập nhật và cảnh báo khi mất tín hiệu; thời gian đến trạm có thể chưa có.',
  ],
  [
    'Vé tháng và ưu đãi hoạt động thế nào?',
    appConfig.demo
      ? 'Bản demo minh họa vé tháng 250.000đ/30 ngày; hồ sơ ưu đãi được duyệt có giá 150.000đ.'
      : 'Vé tháng trực tuyến chưa mở bán. Bạn có thể gửi hồ sơ ưu đãi để nhà xe xét duyệt và liên hệ nhà xe về chính sách áp dụng.',
  ],
];
function SectionHeading({ label, title, text }: { label: string; title: string; text?: string }) {
  return (
    <div className={s.heading}>
      <span>{label}</span>
      <h2>{title}</h2>
      {text && <p>{text}</p>}
    </div>
  );
}
export function Landing() {
  const catalog = useQuery({ queryKey: ['catalog'], queryFn: operationsApi.catalog });
  const trackingTrip = catalog.data?.trips.find(
    t => t.status === 'running' || t.status === 'scheduled'
  );
  const trackingUrl = trackingTrip ? '/tracking/' + trackingTrip.id : '/trips';
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<number | null>(0);
  const scope = useAnimeScope(root, self => {
    // Keep text at full contrast until it enters the viewport.
    // Scope methods also register animations created by scroll callbacks for cleanup.
    self.add('reveal', (section: HTMLElement) =>
      animate(section, { y: [22, 0], opacity: [0.8, 1], duration: 650, ease: 'out(3)' })
    );
    root.current?.querySelectorAll<HTMLElement>('[data-reveal]').forEach(section => {
      onScroll({
        target: section,
        enter: 'bottom-=40 top',
        repeat: false,
        onEnter: () => self.methods.reveal(section),
      });
    });
    self.add('benefits', () =>
      animate('[data-benefit]', {
        y: [16, 0],
        opacity: [0.8, 1],
        delay: stagger(85),
        duration: 500,
      })
    );
    onScroll({ target: '[data-benefits]', repeat: false, onEnter: () => self.methods.benefits() });
    self.add('accordion', (element: HTMLElement) =>
      animate(element, { opacity: [0.65, 1], y: [-4, 0], duration: 180, ease: 'out(2)' })
    );
  });
  useAnimeScope(
    root,
    () => {
      const route = root.current?.querySelector<SVGPathElement>('[data-demo-route]');
      const marker = root.current?.querySelector<SVGGElement>('[data-marker]');
      const position = { distance: 0 };
      animate(position, {
        distance: [0, route?.getTotalLength() || 0],
        onUpdate: () => {
          if (!route || !marker) return;
          const point = route.getPointAtLength(position.distance);
          marker.setAttribute('transform', `translate(${point.x} ${point.y})`);
        },
        ease: 'linear',
        autoplay: onScroll({
          target: '[data-demo-map]',
          sync: true,
          enter: 'bottom top',
          leave: 'top bottom',
        }),
      });
    },
    { mobile: true }
  );
  return (
    <div ref={root}>
      <HeroSection trackingUrl={trackingUrl} />
      <div className={'container ' + s.searchPanel}>
        <div className={s.searchTitle}>
          <span>
            <Route size={19} />
            Bạn muốn đi đâu hôm nay?
          </span>
          <Badge tone="neutral">Tra cứu & đặt vé</Badge>
        </div>
        <SearchForm />
      </div>
      <section id="features" data-reveal className={'container ' + s.section}>
        <SectionHeading
          label="ĐI XE BUÝT, THEO CÁCH CỦA BẠN"
          title="Mỗi hành trình, thêm một chút dễ dàng"
          text="Bớt thời gian chờ đợi. Thêm thời gian cho những điều bạn yêu thích."
        />
        <div className={s.benefits} data-benefits>
          {benefits.map(({ icon: Icon, title, text }, i) => (
            <article data-benefit key={title} className={s.benefit}>
              <div className={s.benefitTop}>
                <span className={s.icon}>
                  <Icon size={23} />
                </span>
                <span className={s.cardNumber}>0{i + 1}</span>
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
              <Link to={i === 3 ? trackingUrl : '/trips'} aria-label={title}>
                <ArrowUpRight size={20} />
              </Link>
            </article>
          ))}
        </div>
      </section>
      <section id="how-it-works" className={s.softSection} data-reveal>
        <div className="container">
          <SectionHeading label="BẮT ĐẦU THẬT ĐƠN GIẢN" title="Ba bước. Một hành trình trọn vẹn." />
          <div className={s.steps}>
            {[
              ['01', 'Tìm chuyến của bạn', 'Chọn điểm đi, điểm đến và thời gian phù hợp.'],
              ['02', 'Đặt vé & thanh toán', 'Chọn chỗ, kiểm tra thông tin và xác nhận đặt vé.'],
              ['03', 'Quét QR, sẵn sàng đi', 'Mở vé điện tử và trình mã QR khi lên xe.'],
            ].map(([n, title, text]) => (
              <div key={n}>
                <span>{n}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className={'container ' + s.section + ' ' + s.tracking} data-reveal data-track>
        <div className={s.map} data-demo-map>
          <div className={s.mapLabel}>
            <MapPin size={16} />
            THÁI NGUYÊN <Badge>Demo</Badge>
          </div>
          <div className={s.mapRoadOne} />
          <div className={s.mapRoadTwo} />
          <div className={s.mapRoadThree} />
          <span className={s.mapPark}>Công viên xanh</span>
          <svg viewBox="0 0 530 350" className={s.mapRoute} aria-hidden="true">
            <path
              data-demo-route
              d="M80 260L180 260Q220 260 220 220V120Q220 85 255 85H420"
              fill="none"
              stroke="#15803d"
              strokeWidth="7"
              strokeLinecap="round"
            />
            <circle cx="80" cy="260" r="9" fill="white" stroke="#15803d" strokeWidth="5" />
            <circle cx="420" cy="85" r="9" fill="white" stroke="#15803d" strokeWidth="5" />
            <g data-marker transform="translate(80 260)">
              <circle className={s.mapBusRadar} r="24" fill="rgba(34, 197, 94, 0.45)" />
              <g className={s.mapBus}>
                <rect
                  data-demo-bus
                  x="-19"
                  y="-19"
                  width="38"
                  height="38"
                  rx="11"
                  fill="#15803d"
                  stroke="white"
                  strokeWidth="2.5"
                />
                <svg
                  viewBox="0 0 28 28"
                  x="-11"
                  y="-11"
                  width="22"
                  height="22"
                  fill="none"
                  aria-label="Xe buýt SmartBus"
                >
                  <rect
                    x="3.5"
                    y="4"
                    width="21"
                    height="17"
                    rx="3.5"
                    fill="#16a34a"
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                  <path d="M5.5 7h17v5.5h-17z" fill="#dcfce7" stroke="#ffffff" strokeWidth="1.2" />
                  <line x1="14" y1="7" x2="14" y2="12.5" stroke="#16a34a" strokeWidth="1.2" />
                  <circle
                    cx="7.5"
                    cy="16.5"
                    r="1.5"
                    fill="#fef08a"
                    stroke="#ffffff"
                    strokeWidth="0.8"
                  />
                  <circle
                    cx="20.5"
                    cy="16.5"
                    r="1.5"
                    fill="#fef08a"
                    stroke="#ffffff"
                    strokeWidth="0.8"
                  />
                  <line
                    x1="11"
                    y1="16.5"
                    x2="17"
                    y2="16.5"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <rect x="5.5" y="21" width="3" height="3" rx="1" fill="#1f2937" />
                  <rect x="19.5" y="21" width="3" height="3" rx="1" fill="#1f2937" />
                </svg>
              </g>
            </g>
          </svg>
          <span className={s.mapStopOne}>Bến xe trung tâm</span>
          <span className={s.mapStopTwo}>Đại học ICTU</span>
          <div className={s.mapInfo}>
            <span className={s.icon}>
              <MapPin size={20} />
            </span>
            <div>
              <strong>Tuyến 01 · Đại học ICTU</strong>
              <small>Trạm tiếp theo · Demo ETA 5 phút</small>
            </div>
            <Badge>Đang di chuyển</Badge>
          </div>
        </div>
        <div className={s.trackingCopy}>
          <span className={s.eyebrow}>CHỦ ĐỘNG TRÊN MỌI HÀNH TRÌNH</span>
          <h2>
            Không còn tự hỏi:
            <br />
            “Xe của mình đến đâu rồi?”
          </h2>
          <p>
            Xem vị trí xe, biết trạm tiếp theo và nhận cập nhật khi hành trình thay đổi. Bạn luôn có
            thông tin để lên kế hoạch tốt hơn.
          </p>
          <ul>
            <li>
              <Check />
              Vị trí xe và thời điểm cập nhật
            </li>
            <li>
              <Check />
              Thời gian đến trạm dự kiến
            </li>
            <li>
              <Check />
              Thông báo trạm và sự cố trên tuyến
            </li>
          </ul>
          <LinkButton to={trackingUrl} secondary>
            Khám phá theo dõi xe
          </LinkButton>
        </div>
      </section>
      <section id="operators" className={s.operatorSection} data-reveal>
        <div className={'container ' + s.operatorGrid}>
          <div>
            <span className={s.eyebrow}>DÀNH CHO NHÀ XE</span>
            <h2>
              Vận hành gọn hơn.
              <br />
              Kết nối tốt hơn.
            </h2>
            <p>
              Một không gian chung cho tuyến xe, lịch trình, con người và doanh thu. Để mỗi chuyến
              xe đều được quản lý rõ ràng.
            </p>
            <div className={s.operatorFeatures}>
              {[
                [Route, 'Tuyến & lịch chạy'],
                [CalendarCheck, 'Xe & phân công'],
                [ShieldCheck, 'Soát vé QR'],
                [BarChart3, 'Báo cáo doanh thu'],
              ].map(([Icon, label]) => {
                const I = Icon as typeof Route;
                return (
                  <span key={String(label)}>
                    <I size={19} />
                    {String(label)}
                  </span>
                );
              })}
            </div>
            <LinkButton to="/admin">Khám phá cổng điều hành</LinkButton>
          </div>
          <div className={s.dashboardPreview}>
            <div className={s.previewHead}>
              <span className={s.dot} />
              SmartBus · Tổng quan vận hành <Badge>Demo</Badge>
            </div>
            <div className={s.previewStats}>
              <div>
                <small>QUẢN LÝ TẬP TRUNG</small>
                <strong>Tuyến & chuyến</strong>
              </div>
              <div>
                <small>THÔNG TIN LIỀN MẠCH</small>
                <strong>Vé & doanh thu</strong>
              </div>
            </div>
            <div className={s.previewChart}>
              {[24, 35, 27, 52, 40, 64, 58, 83, 64, 90, 75, 95].map((h, i) => (
                <span key={i} style={{ height: h + '%' }} />
              ))}
            </div>
            <small>Biểu đồ minh họa · không phải số liệu kinh doanh</small>
            <div className={s.previewRow}>
              <span>
                <Route size={17} />
                Tuyến trung tâm – ICTU
              </span>
              <Badge>Đã phân công</Badge>
            </div>
          </div>
        </div>
      </section>
      <section data-reveal className={'container ' + s.section}>
        <SectionHeading
          label="LỰA CHỌN PHÙ HỢP VỚI BẠN"
          title="Đi một chuyến, hay đi mỗi ngày?"
          text="Linh hoạt theo nhu cầu, minh bạch theo từng loại vé."
        />
        <div className={s.passGrid}>
          <article>
            <Ticket />
            <h3>Vé lượt</h3>
            <p>Một chuyến đi, một chiếc vé. Giá hiển thị rõ trước khi bạn đặt.</p>
            <Link to="/trips">
              Tìm chuyến phù hợp <ArrowRight size={17} />
            </Link>
          </article>
          <article className={s.featuredPass}>
            <Badge>ĐI LẠI THƯỜNG XUYÊN</Badge>
            <h3>Vé tháng</h3>
            <p>
              {appConfig.demo
                ? 'Đăng ký tuyến quen thuộc và quản lý thời hạn ngay trong tài khoản.'
                : 'Vé tháng trực tuyến chưa mở bán. Liên hệ nhà xe để biết chính sách.'}
            </p>
            <Link to="/account/passes">
              Khám phá vé tháng <ArrowRight size={17} />
            </Link>
          </article>
          <article>
            <Leaf />
            <h3>Ưu đãi dành riêng</h3>
            <p>Gửi hồ sơ ưu đãi và theo dõi kết quả duyệt từ nhà xe.</p>
            <Link to="/account/passes">
              Xem chính sách {appConfig.demo ? 'demo' : ''} <ArrowRight size={17} />
            </Link>
          </article>
        </div>
      </section>
      <section id="faq" data-reveal className={'container ' + s.faqSection}>
        <div>
          <span className={s.eyebrow}>BẠN HỎI, SMARTBUS TRẢ LỜI</span>
          <h2>
            Một vài điều
            <br />
            bạn có thể muốn biết.
          </h2>
          <p>Chưa tìm thấy câu trả lời?</p>
          <Link to="/account/support">
            Gửi câu hỏi cho chúng tôi <ArrowUpRight size={17} />
          </Link>
        </div>
        <div>
          {faqs.map(([question, answer], i) => (
            <div className={s.faq} key={question}>
              <button
                aria-expanded={open === i}
                aria-controls={'faq-' + i}
                onClick={() => {
                  setOpen(open === i ? null : i);
                  requestAnimationFrame(() => {
                    const element = document.getElementById('faq-' + i);
                    if (element) scope.current?.methods.accordion(element);
                  });
                }}
              >
                {question}
                <ChevronDown size={18} style={{ transform: open === i ? 'rotate(180deg)' : '' }} />
              </button>
              <div id={'faq-' + i} hidden={open !== i}>
                <p>{answer}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className={'container ' + s.finalCta} data-reveal>
        <div>
          <span>SẴN SÀNG CHO CHUYẾN ĐI TIẾP THEO?</span>
          <h2>Đi thông minh hơn, bắt đầu từ hôm nay.</h2>
          <p>Chọn hành trình của bạn. SmartBus lo phần còn lại.</p>
        </div>
        <LinkButton to="/trips">Tra cứu chuyến ngay</LinkButton>
      </section>
      {appConfig.demo && (
        <div className={'container ' + s.demoNote}>
          <Bell size={15} />
          Đây là ứng dụng demo. Thanh toán, GPS và xác thực vé đang được mô phỏng.
        </div>
      )}
    </div>
  );
}

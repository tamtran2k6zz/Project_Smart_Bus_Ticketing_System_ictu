const HERO_STARS = [
  { left: '4%', top: '9%', size: 2, delay: '0s' },
  { left: '11%', top: '21%', size: 1.5, delay: '1.2s' },
  { left: '19%', top: '7%', size: 2.5, delay: '0.6s' },
  { left: '27%', top: '15%', size: 1.5, delay: '2.1s' },
  { left: '35%', top: '5%', size: 2, delay: '0.3s' },
  { left: '44%', top: '12%', size: 1.5, delay: '1.6s' },
  { left: '53%', top: '6%', size: 2.5, delay: '0.9s' },
  { left: '62%', top: '17%', size: 1.5, delay: '2.5s' },
  { left: '70%', top: '8%', size: 2, delay: '0.4s' },
  { left: '79%', top: '14%', size: 1.5, delay: '1.1s' },
  { left: '87%', top: '10%', size: 2, delay: '1.9s' },
  { left: '94%', top: '19%', size: 1.5, delay: '0.7s' },
];

const SKYLINE_WINDOWS = [
  { x: 156, y: 84 },
  { x: 168, y: 84 },
  { x: 156, y: 100 },
  { x: 366, y: 74 },
  { x: 378, y: 90 },
  { x: 588, y: 64 },
  { x: 602, y: 80 },
  { x: 614, y: 64 },
  { x: 826, y: 86 },
  { x: 838, y: 102 },
  { x: 934, y: 74 },
  { x: 946, y: 90 },
  { x: 1168, y: 68 },
  { x: 1180, y: 84 },
];

function QrTicketCard() {
  return (
    <div
      className="scene-ticket"
      style={{
        background: 'rgba(8, 14, 28, 0.78)',
        boxShadow: '0 0 26px rgba(34, 211, 238, 0.28)',
      }}
    >
      <div className="scene-ticket-qr">
        <svg width="44" height="44" viewBox="0 0 100 100" fill="#04070f">
          <rect x="4" y="4" width="24" height="24" />
          <rect x="9" y="9" width="14" height="14" fill="#ffffff" />
          <rect x="13" y="13" width="6" height="6" />
          <rect x="72" y="4" width="24" height="24" />
          <rect x="77" y="9" width="14" height="14" fill="#ffffff" />
          <rect x="81" y="13" width="6" height="6" />
          <rect x="4" y="72" width="24" height="24" />
          <rect x="9" y="77" width="14" height="14" fill="#ffffff" />
          <rect x="13" y="81" width="6" height="6" />
          <rect x="38" y="8" width="8" height="8" />
          <rect x="52" y="4" width="8" height="8" />
          <rect x="4" y="38" width="8" height="8" />
          <rect x="18" y="52" width="8" height="8" />
          <rect x="38" y="38" width="10" height="10" />
          <rect x="56" y="52" width="8" height="8" />
          <rect x="72" y="38" width="8" height="8" />
          <rect x="88" y="52" width="8" height="8" />
          <rect x="38" y="72" width="8" height="8" />
          <rect x="56" y="88" width="8" height="8" />
          <rect x="72" y="60" width="8" height="8" />
          <rect x="4" y="88" width="8" height="8" />
        </svg>
        <span
          className="scene-position"
          style={{
            left: '6px',
            right: '6px',
            top: '20%',
            height: '2px',
            background: '#22d3ee',
            boxShadow: '0 0 8px #22d3ee',
            animation: 'sb-scan 2.4s ease-in-out infinite',
          }}
        />
      </div>
      <div className="scene-ticket-text">
        <span className="scene-ticket-title">VÉ ĐIỆN TỬ</span>
        <span className="scene-ticket-detail">TUYEN-01 • GHẾ 12A</span>
        <span className="scene-ticket-fare">10.000đ • HH 23:59</span>
      </div>
    </div>
  );
}

export function HeroBusScene() {
  return (
    <div className="sb-anim scene-layer" aria-hidden="true">
      {/* Twinkling stars */}
      {HERO_STARS.map((st, i) => (
        <span
          key={i}
          className="scene-star"
          style={{
            left: st.left,
            top: st.top,
            width: st.size,
            height: st.size,
            animation: `sb-twinkle 3.4s ease-in-out ${st.delay} infinite`,
          }}
        />
      ))}

      {/* City skyline silhouette */}
      <svg
        className="scene-full-width"
        style={{ bottom: '16%', height: '24vh', opacity: 0.9 }}
        viewBox="0 0 1440 220"
        preserveAspectRatio="none"
      >
        <path
          fill="var(--skyline)"
          d="M0 220 L0 140 L60 140 L60 96 L110 96 L110 150 L150 150 L150 70 L170 70 L170 40 L186 40 L186 70 L210 70 L210 130 L260 130 L260 88 L310 88 L310 150 L360 150 L360 60 L400 60 L400 120 L470 120 L470 90 L520 90 L520 160 L580 160 L580 52 L600 52 L600 30 L618 30 L618 52 L640 52 L640 140 L700 140 L700 100 L760 100 L760 156 L820 156 L820 76 L870 76 L870 116 L930 116 L930 64 L980 64 L980 130 L1040 130 L1040 92 L1100 92 L1100 150 L1160 150 L1160 58 L1210 58 L1210 110 L1270 110 L1270 86 L1330 86 L1330 146 L1390 146 L1390 104 L1440 104 L1440 220 Z"
        />
        <g fill="#7dd3fc">
          {SKYLINE_WINDOWS.map((w, i) => (
            <rect
              key={i}
              x={w.x}
              y={w.y}
              width="7"
              height="9"
              rx="1"
              opacity="0.55"
              style={{ animation: `sb-twinkle 4.2s ease-in-out ${i * 0.45}s infinite` }}
            />
          ))}
        </g>
      </svg>

      {/* Road */}
      <div
        className="scene-road"
        style={{
          height: '16%',
          minHeight: '120px',
          background: 'var(--road-gradient)',
          boxShadow: 'inset 0 1px 0 rgba(148, 197, 255, 0.18)',
        }}
      >
        <div
          className="scene-full-width"
          style={{
            top: '56%',
            height: '3px',
            background:
              'repeating-linear-gradient(90deg, rgba(125, 211, 252, 0.55) 0 46px, transparent 46px 110px)',
            animation: 'sb-dash 1.05s linear infinite',
          }}
        />
      </div>

      {/* Bus stop marker */}
      <div
        className="scene-stop"
        style={{ left: '9%', bottom: 'calc(16% + 14px)', background: 'rgba(8, 14, 28, 0.6)' }}
      >
        <span className="scene-stop-icon">🚏</span>
        <span className="scene-dot">
          <span className="scene-dot-ping"></span>
          <span className="scene-dot-core"></span>
        </span>
      </div>

      {/* Driving bus */}
      <div
        className="scene-position"
        style={{ bottom: 'calc(16% - 12px)', left: 0, animation: 'sb-drive 17s linear infinite' }}
      >
        <div style={{ animation: 'sb-bob 1.7s ease-in-out infinite' }}>
          <svg
            viewBox="0 0 340 150"
            style={{ width: 'clamp(280px, 36vw, 430px)', height: 'auto', display: 'block' }}
          >
            <defs>
              <linearGradient id="sbBusBody" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1d5a86" />
                <stop offset="55%" stopColor="#123c63" />
                <stop offset="100%" stopColor="#0a2540" />
              </linearGradient>
              <linearGradient id="sbBusGlass" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#bdf0ff" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.55" />
              </linearGradient>
              <linearGradient id="sbBusStripe" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#22d3ee" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
              <radialGradient id="sbBeam">
                <stop offset="0%" stopColor="#fef9c3" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#fef9c3" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="sbGlow">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* under glow */}
            <ellipse
              cx="170"
              cy="136"
              rx="150"
              ry="11"
              fill="url(#sbGlow)"
              style={{ animation: 'sb-glow 2.6s ease-in-out infinite' }}
            />

            {/* body */}
            <rect
              x="22"
              y="26"
              width="290"
              height="88"
              rx="17"
              fill="url(#sbBusBody)"
              stroke="rgba(125, 211, 252, 0.55)"
              strokeWidth="1.5"
            />
            <rect
              x="120"
              y="17"
              width="74"
              height="11"
              rx="5"
              fill="#0e2f4d"
              stroke="rgba(125, 211, 252, 0.35)"
              strokeWidth="1"
            />
            <rect
              x="238"
              y="12"
              width="46"
              height="17"
              rx="5"
              fill="#0e7490"
              stroke="rgba(165, 243, 252, 0.6)"
              strokeWidth="1"
            />
            <text
              x="261"
              y="24.5"
              textAnchor="middle"
              fontSize="10.5"
              fill="#a5f3fc"
              fontWeight="700"
            >
              01
            </text>

            {/* windows, door & windshield */}
            <rect x="34" y="36" width="42" height="30" rx="6" fill="url(#sbBusGlass)" />
            <rect x="84" y="36" width="42" height="30" rx="6" fill="url(#sbBusGlass)" />
            <rect x="134" y="36" width="42" height="30" rx="6" fill="url(#sbBusGlass)" />
            <rect
              x="184"
              y="34"
              width="42"
              height="58"
              rx="6"
              fill="#0d2c49"
              stroke="rgba(125, 211, 252, 0.4)"
              strokeWidth="1"
            />
            <rect x="188" y="38" width="16" height="34" rx="3" fill="url(#sbBusGlass)" />
            <rect x="206" y="38" width="16" height="34" rx="3" fill="url(#sbBusGlass)" />
            <rect x="248" y="36" width="50" height="34" rx="8" fill="url(#sbBusGlass)" />

            {/* stripe & branding */}
            <rect x="22" y="80" width="290" height="6" fill="url(#sbBusStripe)" opacity="0.85" />
            <text
              x="112"
              y="102"
              fontSize="11"
              letterSpacing="3"
              fill="#7dd3fc"
              opacity="0.85"
              fontWeight="600"
            >
              SMARTBUS
            </text>

            {/* lights */}
            <circle cx="310" cy="64" r="4.5" fill="#fde68a" />
            <ellipse cx="322" cy="64" rx="18" ry="12" fill="url(#sbBeam)" />
            <rect x="20" y="56" width="5" height="11" rx="2.5" fill="#f87171" />

            {/* wheels */}
            <circle cx="88" cy="116" r="18" fill="#020617" stroke="#1f2b3d" strokeWidth="3" />
            <g className="sb-wheel">
              <rect x="80" y="114.4" width="16" height="3.2" rx="1.6" fill="#94a3b8" />
              <rect x="86.4" y="108" width="3.2" height="16" rx="1.6" fill="#94a3b8" />
            </g>
            <circle cx="88" cy="116" r="3.4" fill="#cbd5e1" />
            <circle cx="252" cy="116" r="18" fill="#020617" stroke="#1f2b3d" strokeWidth="3" />
            <g className="sb-wheel">
              <rect x="244" y="114.4" width="16" height="3.2" rx="1.6" fill="#94a3b8" />
              <rect x="250.4" y="108" width="3.2" height="16" rx="1.6" fill="#94a3b8" />
            </g>
            <circle cx="252" cy="116" r="3.4" fill="#cbd5e1" />
          </svg>
        </div>
      </div>

      {/* Floating QR e-ticket */}
      <div
        className="scene-floating-ticket"
        style={{ left: '67%', bottom: '23%', animation: 'sb-float 5.2s ease-in-out infinite' }}
      >
        <QrTicketCard />
      </div>

      {/* Readability veil */}
      <div className="scene-cover" style={{ background: 'var(--scene-veil)' }} />
    </div>
  );
}

// ==========================================
// 1.5 ROUTE MAP SCENE — xe buýt chạy theo lộ trình giữa các trạm
// ==========================================
export function RouteMapScene({ reducedMotion }: { reducedMotion: boolean }) {
  const stops = [
    { x: 40, y: 700, delay: '0s' },
    { x: 520, y: 560, delay: '0.65s' },
    { x: 950, y: 610, delay: '1.3s' },
    { x: 1400, y: 330, delay: '1.95s' },
  ];
  return (
    <div className="sb-anim scene-layer" aria-hidden="true">
      <div
        className="scene-cover"
        style={{
          backgroundImage: 'radial-gradient(rgba(148, 197, 255, 0.14) 1px, transparent 1px)',
          backgroundSize: '34px 34px',
          opacity: 0.5,
        }}
      />
      <svg
        className="scene-map"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        style={{ opacity: 0.55 }}
      >
        <defs>
          <linearGradient id="sbRouteGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0" />
            <stop offset="18%" stopColor="#22d3ee" stopOpacity="0.85" />
            <stop offset="82%" stopColor="#818cf8" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
          </linearGradient>
        </defs>

        <path
          id="sbRoutePath"
          d="M 40 700 C 220 760 330 600 520 560 C 700 522 760 660 950 610 C 1120 566 1210 460 1400 330"
          fill="none"
          stroke="url(#sbRouteGrad)"
          strokeWidth="3.5"
          strokeDasharray="16 13"
          strokeLinecap="round"
          style={{ animation: 'sb-dashflow 5s linear infinite' }}
        />

        {stops.map((s, i) => (
          <g key={i}>
            <circle
              cx={s.x}
              cy={s.y}
              r="9"
              fill="none"
              stroke="#67e8f9"
              strokeWidth="2"
              className="sb-pulse"
              style={{ animationDelay: s.delay }}
            />
            <circle cx={s.x} cy={s.y} r="6" fill="#0b1224" stroke="#7dd3fc" strokeWidth="2" />
            <text x={s.x} y={s.y - 18} fontSize="15" textAnchor="middle" opacity="0.7">
              🚏
            </text>
          </g>
        ))}

        <g transform={reducedMotion ? 'translate(520 560)' : undefined}>
          {!reducedMotion && (
            <animateMotion dur="18s" repeatCount="indefinite" rotate="auto">
              <mpath href="#sbRoutePath" xlinkHref="#sbRoutePath" />
            </animateMotion>
          )}
          <g transform="translate(0, -20)">
            <rect
              x="-14"
              y="-26"
              width="28"
              height="8"
              rx="3"
              fill="#155e75"
              stroke="#7dd3fc"
              strokeWidth="1"
            />
            <rect
              x="-30"
              y="-16"
              width="60"
              height="28"
              rx="8"
              fill="#0e7490"
              stroke="#67e8f9"
              strokeWidth="1.5"
            />
            <rect x="-22" y="-10" width="11" height="10" rx="2.5" fill="#bae6fd" />
            <rect x="-7" y="-10" width="11" height="10" rx="2.5" fill="#bae6fd" />
            <rect x="8" y="-10" width="11" height="10" rx="2.5" fill="#bae6fd" />
            <rect x="-30" y="4" width="60" height="3.5" fill="#22d3ee" opacity="0.8" />
            <circle cx="-16" cy="13" r="5.5" fill="#020617" stroke="#67e8f9" strokeWidth="1.5" />
            <circle cx="16" cy="13" r="5.5" fill="#020617" stroke="#67e8f9" strokeWidth="1.5" />
          </g>
        </g>
      </svg>
    </div>
  );
}

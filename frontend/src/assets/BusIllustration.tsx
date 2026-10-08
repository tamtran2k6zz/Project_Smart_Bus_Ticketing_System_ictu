export function BusIllustration() {
  return (
    <svg
      viewBox="0 0 680 430"
      role="img"
      aria-label="Minh họa xe buýt SmartBus trên đường phố xanh"
    >
      <defs>
        <linearGradient id="bus-body" x1="0" y1="0" x2=".7" y2="1">
          <stop stopColor="#2bac62" />
          <stop offset="1" stopColor="#116f37" />
        </linearGradient>
        <linearGradient id="bus-window" x2="0" y2="1">
          <stop stopColor="#263e38" />
          <stop offset="1" stopColor="#172b26" />
        </linearGradient>
        <filter id="shadow">
          <feGaussianBlur stdDeviation="8" />
        </filter>
      </defs>
      <circle cx="350" cy="205" r="187" fill="#dcedd8" />
      <circle cx="500" cy="112" r="38" fill="#c7dfbd" />
      <g fill="#b9d3b5">
        <rect x="73" y="143" width="66" height="161" rx="7" />
        <rect x="131" y="95" width="92" height="208" rx="8" />
        <rect x="547" y="161" width="60" height="146" rx="5" />
      </g>
      <g fill="#eff7e9">
        <path d="M148 119h15v20h-15zm31 0h15v20h-15zm-31 38h15v20h-15zm31 0h15v20h-15zm-31 38h15v20h-15zm31 0h15v20h-15z" />
      </g>
      <g>
        <rect x="50" y="230" width="9" height="78" rx="4" fill="#7d9c74" />
        <circle cx="54" cy="216" r="36" fill="#9fc498" />
        <rect x="612" y="260" width="9" height="55" fill="#769b6c" />
        <circle cx="617" cy="242" r="30" fill="#88b481" />
      </g>
      <ellipse
        cx="351"
        cy="358"
        rx="253"
        ry="19"
        fill="#849f77"
        opacity=".2"
        filter="url(#shadow)"
      />
      <path d="M75 329h532" stroke="#afc9a4" strokeWidth="2" />
      <path d="M37 384h583" stroke="#a5b89d" strokeWidth="2" strokeDasharray="45 30" />
      <g transform="translate(81 85)">
        <path
          d="M38 90Q38 46 82 45H406Q446 45 461 83L490 196V229Q490 246 470 246H30Q11 246 11 227V133Q11 104 38 90"
          fill="url(#bus-body)"
        />
        <path d="M45 76h363q15 0 23 16l23 82H32v-63q0-20 13-35" fill="url(#bus-window)" />
        <path d="M340 76h68q15 0 23 16l23 82H340z" fill="#324d43" />
        <path d="M64 80h4v91h-4zm80 0h5v91h-5zm80 0h5v91h-5zm82 0h6v91h-6" fill="#69a287" />
        <path d="M349 181h83v65h-83z" fill="#125b32" />
        <path d="M388 182v63" stroke="#75ac87" strokeWidth="2" />
        <path d="M355 188h26v37h-26zm40 0h27v37h-27z" fill="#263e38" />
        <path d="M28 181h301v5H28z" fill="#b3d9b1" />
        <text x="86" y="218" fontSize="29" fill="white" fontWeight="700" fontFamily="sans-serif">
          SmartBus
        </text>
        <text x="88" y="233" fontSize="8" letterSpacing="2" fill="#d6edda">
          HÀNH TRÌNH XANH • KẾT NỐI BẠN
        </text>
        <path d="M349 47h65v20h-65z" fill="#1e392a" />
        <text x="356" y="61" fontSize="10" fill="#d4e88a" fontFamily="sans-serif">
          01 · SMARTBUS
        </text>
        <rect x="19" y="215" width="13" height="9" rx="3" fill="#ffdd8a" />
        <rect x="463" y="207" width="16" height="12" rx="3" fill="#faf6ce" />
        <circle cx="98" cy="246" r="31" fill="#14281e" />
        <circle cx="98" cy="246" r="18" fill="#819b83" />
        <circle cx="98" cy="246" r="10" fill="#b8cbb8" />
        <circle cx="425" cy="246" r="31" fill="#14281e" />
        <circle cx="425" cy="246" r="18" fill="#819b83" />
        <circle cx="425" cy="246" r="10" fill="#b8cbb8" />
        <path d="M31 231h30m398 1h24" stroke="#6daf7a" strokeWidth="4" />
        <path d="M27 126H6v35h16" fill="none" stroke="#215336" strokeWidth="7" />
      </g>
    </svg>
  );
}

/**
 * Utility to generate SVG Data URLs for realistic Vietnamese Student / Concession Cards.
 * Used for demo seed data and instant previews.
 */

export function generateStudentCardSvg({
  fullName,
  studentId,
  schoolName,
  facultyOrClass,
  birthDate,
  expiryDate,
  cardType = 'THẺ SINH VIÊN',
  themeColor = '#15803d',
  isBack = false,
}: {
  fullName: string;
  studentId: string;
  schoolName: string;
  facultyOrClass?: string;
  birthDate?: string;
  expiryDate?: string;
  cardType?: string;
  themeColor?: string;
  isBack?: boolean;
}): string {
  if (isBack) {
    const svgBack = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 340" width="540" height="340">
      <defs>
        <linearGradient id="bgBack" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f8fafc"/>
          <stop offset="100%" stop-color="#e2e8f0"/>
        </linearGradient>
      </defs>
      <rect width="540" height="340" rx="16" fill="url(#bgBack)" stroke="#cbd5e1" stroke-width="2"/>
      
      <!-- Magnetic Stripe -->
      <rect x="0" y="30" width="540" height="48" fill="#1e293b"/>
      
      <!-- Barcode simulation -->
      <g transform="translate(40, 110)">
        <rect width="460" height="60" fill="#ffffff" rx="4" stroke="#cbd5e1"/>
        <!-- barcode vertical lines -->
        ${Array.from({ length: 45 })
          .map((_, i) => {
            const w = (i % 3 === 0 ? 3 : i % 2 === 0 ? 2 : 1);
            return `<rect x="${15 + i * 9.5}" y="10" width="${w}" height="40" fill="#0f172a"/>`;
          })
          .join('')}
      </g>
      <text x="270" y="195" font-family="system-ui, sans-serif" font-size="13" font-weight="600" fill="#475569" text-anchor="middle">
        *${studentId}*
      </text>

      <!-- Terms & Notes -->
      <g transform="translate(40, 220)" font-family="system-ui, sans-serif" font-size="11" fill="#64748b">
        <text x="0" y="0">• Thẻ có giá trị chứng nhận tư cách ${cardType.toLowerCase()} khi tham gia phương tiện công cộng.</text>
        <text x="0" y="18">• Thẻ chỉ có giá trị khi còn trong niên khóa đào tạo đến ngày: ${expiryDate || '30/06/2028'}.</text>
        <text x="0" y="36">• Nếu nhặt được thẻ xin gửi về: Văn phòng Đoàn - ${schoolName}.</text>
        <text x="0" y="54">• Hỗ trợ vé xe buýt SmartBus ICTU: 1900 6868</text>
      </g>
      
      <rect x="420" y="270" width="80" height="45" rx="6" fill="#f1f5f9" stroke="#94a3b8" stroke-dasharray="2 2"/>
      <text x="460" y="297" font-family="system-ui, sans-serif" font-size="9" fill="#94a3b8" text-anchor="middle">CHIP NFC</text>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svgBack)}`;
  }

  // Front card
  const svgFront = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 340" width="540" height="340">
    <defs>
      <linearGradient id="headerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${themeColor}"/>
        <stop offset="100%" stop-color="#0f5132"/>
      </linearGradient>
      <linearGradient id="cardBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="100%" stop-color="#f0fdf4"/>
      </linearGradient>
      <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
        <feDropShadow dx="0" dy="4" stdDeviation="4" flood-opacity="0.15"/>
      </filter>
    </defs>
    
    <!-- Background Card with rounded corners -->
    <rect width="540" height="340" rx="16" fill="url(#cardBg)" stroke="#cbd5e1" stroke-width="2"/>
    
    <!-- Header Banner -->
    <rect width="540" height="74" rx="16" fill="url(#headerGrad)"/>
    <rect y="58" width="540" height="16" fill="url(#headerGrad)"/>
    
    <!-- School Emblem / Badge Icon -->
    <g transform="translate(24, 14)">
      <circle cx="23" cy="23" r="23" fill="#ffffff" filter="url(#shadow)"/>
      <circle cx="23" cy="23" r="19" fill="${themeColor}"/>
      <text x="23" y="29" font-family="system-ui, sans-serif" font-size="16" font-weight="900" fill="#ffffff" text-anchor="middle">ICTU</text>
    </g>
    
    <!-- Header Titles -->
    <text x="82" y="32" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#ffffff" letter-spacing="0.5">
      ĐẠI HỌC THÁI NGUYÊN
    </text>
    <text x="82" y="52" font-family="system-ui, sans-serif" font-size="13" font-weight="800" fill="#ffffff">
      ${schoolName.toUpperCase()}
    </text>
    
    <!-- Card Type Banner -->
    <rect x="0" y="74" width="540" height="28" fill="#dcfce7"/>
    <text x="270" y="93" font-family="system-ui, sans-serif" font-size="13" font-weight="900" fill="${themeColor}" text-anchor="middle" letter-spacing="2">
      ${cardType}
    </text>

    <!-- Student Avatar Photo Box -->
    <g transform="translate(26, 118)">
      <rect width="110" height="145" rx="8" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.5" filter="url(#shadow)"/>
      <!-- Portrait silhouette -->
      <circle cx="55" cy="52" r="28" fill="#94a3b8"/>
      <path d="M 20 135 C 20 95, 90 95, 90 135 Z" fill="#64748b"/>
      <!-- Photo Stamp / Border -->
      <text x="55" y="140" font-family="system-ui, sans-serif" font-size="9" fill="#475569" text-anchor="middle">ẢNH 3x4</text>
    </g>

    <!-- Student Details Info -->
    <g transform="translate(155, 126)" font-family="system-ui, sans-serif">
      <!-- Full Name -->
      <text x="0" y="18" font-size="11" fill="#64748b" font-weight="600">HỌ VÀ TÊN:</text>
      <text x="0" y="40" font-size="16" fill="#0f172a" font-weight="800" letter-spacing="0.5">
        ${fullName.toUpperCase()}
      </text>

      <!-- Student ID -->
      <text x="0" y="66" font-size="11" fill="#64748b" font-weight="600">MÃ SINH VIÊN / HS:</text>
      <text x="140" y="66" font-size="13" fill="${themeColor}" font-weight="800">
        ${studentId}
      </text>

      <!-- Class / Faculty -->
      <text x="0" y="90" font-size="11" fill="#64748b" font-weight="600">KHOA / LỚP:</text>
      <text x="140" y="90" font-size="12" fill="#1e293b" font-weight="700">
        ${facultyOrClass || 'Công nghệ Thông tin'}
      </text>

      <!-- Birth Date -->
      <text x="0" y="114" font-size="11" fill="#64748b" font-weight="600">NGÀY SINH:</text>
      <text x="140" y="114" font-size="12" fill="#1e293b" font-weight="600">
        ${birthDate || '15/09/2005'}
      </text>

      <!-- Expiry Date -->
      <text x="0" y="138" font-size="11" fill="#64748b" font-weight="600">GIÁ TRỊ ĐẾN:</text>
      <text x="140" y="138" font-size="12" fill="#b91c1c" font-weight="700">
        ${expiryDate || '30/06/2028'}
      </text>
    </g>

    <!-- Official Red Stamp Simulation -->
    <g transform="translate(420, 215)">
      <circle cx="35" cy="35" r="34" fill="none" stroke="#dc2626" stroke-width="2" stroke-dasharray="6 3" opacity="0.85"/>
      <circle cx="35" cy="35" r="28" fill="none" stroke="#dc2626" stroke-width="1.5" opacity="0.85"/>
      <path d="M 20 35 L 50 35 M 35 20 L 35 50" stroke="#dc2626" stroke-width="1" opacity="0.7"/>
      <text x="35" y="32" font-family="system-ui, sans-serif" font-size="7" font-weight="800" fill="#dc2626" text-anchor="middle" opacity="0.85">ĐẠI HỌC</text>
      <text x="35" y="42" font-family="system-ui, sans-serif" font-size="7" font-weight="800" fill="#dc2626" text-anchor="middle" opacity="0.85">ICTU</text>
    </g>

    <!-- SmartBus Concession Watermark -->
    <g transform="translate(24, 290)">
      <rect width="492" height="34" rx="6" fill="#f8fafc" stroke="#e2e8f0"/>
      <text x="16" y="22" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="${themeColor}">
        SMARTBUS ICTU • HỒ SƠ ƯU ĐÃI XE BUÝT HỌC SINH - SINH VIÊN
      </text>
      <circle cx="465" cy="17" r="7" fill="#22c55e"/>
      <text x="465" y="21" font-family="system-ui, sans-serif" font-size="10" font-weight="900" fill="#ffffff" text-anchor="middle">✓</text>
    </g>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svgFront)}`;
}

export const SAMPLE_STUDENT_CARDS = [
  {
    id: 'sample-1',
    label: 'Thẻ SV ĐH CNTT & TT (ICTU) - Nguyễn Minh Anh',
    fullName: 'Nguyễn Minh Anh',
    studentId: 'DTC245220054',
    schoolName: 'Trường Đại học Công nghệ Thông tin & Truyền thông',
    facultyOrClass: 'Khoa CNTT - Lớp D24CNTT01',
    birthDate: '15/09/2005',
    expiryDate: '30/06/2028',
    category: 'Sinh viên',
    themeColor: '#15803d',
  },
  {
    id: 'sample-2',
    label: 'Thẻ HS THPT Chuyên Thái Nguyên - Trần Văn Hùng',
    fullName: 'Trần Văn Hùng',
    studentId: 'CTN2024-089',
    schoolName: 'Trường THPT Chuyên Thái Nguyên',
    facultyOrClass: 'Lớp 12 Chuyên Tin học',
    birthDate: '20/03/2007',
    expiryDate: '31/05/2027',
    category: 'Học sinh',
    themeColor: '#1d4ed8',
  },
  {
    id: 'sample-3',
    label: 'Thẻ SV ĐH Sư Phạm Thái Nguyên - Lê Thu Hà',
    fullName: 'Lê Thu Hà',
    studentId: 'DTS235110023',
    schoolName: 'Trường Đại học Sư Phạm Thái Nguyên',
    facultyOrClass: 'Khoa Ngoại ngữ - K58',
    birthDate: '10/11/2004',
    expiryDate: '30/06/2027',
    category: 'Sinh viên',
    themeColor: '#7c3aed',
  },
  {
    id: 'sample-4',
    label: 'Thẻ SV ĐH Y Dược Thái Nguyên - Phạm Thanh Mai',
    fullName: 'Phạm Thanh Mai',
    studentId: 'DTY225330012',
    schoolName: 'Trường Đại học Y Dược Thái Nguyên',
    facultyOrClass: 'Khoa Dược học - K55',
    birthDate: '05/02/2003',
    expiryDate: '30/06/2026',
    category: 'Sinh viên',
    themeColor: '#0284c7',
  },
];

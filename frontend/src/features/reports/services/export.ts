import type { Report } from '../types';
import type { ReportFilter } from './reports.api';
import { money } from '@/utils/format';
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function createPdf(title: string, lines: string[]) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  const response = await fetch('/fonts/report-font.ttf');
  if (!response.ok) throw new Error('Chưa tải được font PDF tiếng Việt.');
  const buffer = new Uint8Array(await response.arrayBuffer());
  let binary = '';
  for (const byte of buffer) binary += String.fromCharCode(byte);
  doc.addFileToVFS('report.ttf', btoa(binary));
  doc.addFont('report.ttf', 'BeVietnam', 'normal');
  doc.setFont('BeVietnam');
  doc.setFontSize(18);
  doc.text(title, 18, 22);
  doc.setFontSize(10);
  doc.setTextColor(75, 85, 99);
  let y = 34;
  for (const line of lines) {
    const wrapped = doc.splitTextToSize(line.replace(/[–—→]/g, '-'), 174) as string[];
    for (const text of wrapped) {
      if (y > 275) {
        doc.addPage();
        y = 20;
      }
      doc.text(text, 18, y);
      y += 7;
    }
    y += 3;
  }
  return doc.output('blob');
}
export async function exportReport(
  report: Report,
  filter: ReportFilter,
  format: 'xlsx' | 'pdf',
  demo: boolean
) {
  const label = demo ? 'DEMO – KHÔNG PHẢI CHỨNG TỪ TÀI CHÍNH' : 'BÁO CÁO';
  if (format === 'pdf') {
    const blob = await createPdf('SmartBus · Báo cáo doanh thu', [
      label,
      'Kỳ: ' + filter.from + ' → ' + filter.to,
      'Tuyến: ' + (filter.routeId || 'Tất cả'),
      'Doanh thu thuần (gồm khoản chưa hoàn): ' + money(report.revenue),
      'Số vé đang có hiệu lực: ' + report.tickets,
      'Tỷ lệ lấp đầy: ' + report.occupancy + '%',
      ...report.rows.map(
        r =>
          r.date +
          ' | ' +
          r.route +
          ' | ' +
          money(r.revenue) +
          ' | ' +
          r.tickets +
          '/' +
          r.capacity +
          ' chỗ | ' +
          r.occupancy +
          '%'
      ),
      'Trạng thái hoàn tiền:',
      ...report.refunds.map(r => r.id + ' | ' + money(r.total) + ' | ' + r.refund),
    ]);
    download(blob, 'smartbus-report-' + filter.from + '.pdf');
    return;
  }
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SmartBus';
  const sheet = workbook.addWorksheet('Doanh thu');
  sheet.addRow([label]);
  sheet.addRow([
    'Từ ngày',
    filter.from,
    'Đến ngày',
    filter.to,
    'Tuyến',
    filter.routeId || 'Tất cả',
  ]);
  sheet.addRow([
    'Tổng doanh thu',
    report.revenue,
    'Tổng vé',
    report.tickets,
    'Lấp đầy %',
    report.occupancy,
  ]);
  sheet.addRow([
    'Ngày',
    'Tuyến',
    'Mã tuyến',
    'Doanh thu VND',
    'Vé hiệu lực',
    'Sức chứa',
    'Lấp đầy %',
  ]);
  report.rows.forEach(r =>
    sheet.addRow([r.date, r.route, r.routeId, r.revenue, r.tickets, r.capacity, r.occupancy])
  );
  sheet.columns.forEach((column, i) => (column.width = i === 1 ? 40 : 20));
  sheet.getRow(4).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF15803D' } };
  sheet.getColumn(4).numFmt = '#,##0';
  sheet.views = [{ state: 'frozen', ySplit: 4 }];
  const refunds = workbook.addWorksheet('Hoan tien');
  refunds.addRow(['Mã đặt vé', 'Số tiền VND', 'Trạng thái']);
  report.refunds.forEach(r => refunds.addRow([r.id, r.total, r.refund]));
  refunds.columns.forEach(c => (c.width = 30));
  const buffer = await workbook.xlsx.writeBuffer();
  download(
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    'smartbus-report-' + filter.from + '.xlsx'
  );
}

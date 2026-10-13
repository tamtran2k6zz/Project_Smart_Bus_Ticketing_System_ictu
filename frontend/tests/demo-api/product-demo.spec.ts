import { test, expect, type Page } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
const ids = JSON.parse(readFileSync('../backend/demo-output/ids.json', 'utf8'));
async function login(page: Page, role: string) {
  await page.goto('/login');
  await page.getByLabel('Email hoặc số điện thoại').fill(role + '@smartbus.demo');
  await page.getByLabel('Mật khẩu', { exact: true }).fill('SmartBus123!');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem('smartbus.session.v1') || '{}').state?.user?.email
      )
    )
    .toBe(role + '@smartbus.demo');
  await expect(page.getByRole('button', { name: 'Đăng xuất' })).toBeVisible();
}
async function api(page: Page, path: string, method = 'GET', body?: unknown) {
  return page.evaluate(
    async ({ path, method, body }) => {
      const res = await fetch('/api/smartbus/v1' + path, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + sessionStorage.getItem('smartbus.accessToken.v1'),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (!res.ok) throw new Error(path + ' ' + res.status + ' ' + (await res.text()));
      return res.json();
    },
    { path, method, body }
  );
}
test('API demo: booking, signed payment, invoice email, monthly pass, renewal and crew scan', async ({
  page,
  browser,
}) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await login(page, 'passenger');
  await expect(page.getByText(/DEMO API CỤC BỘ/)).toBeVisible();
  await page.goto('/booking/' + ids.activeTrip);
  await page.getByRole('button', { name: 'Ghế A01', exact: true }).click();
  await page.getByRole('button', { name: 'ĐẶT CHỖ', exact: true }).click();
  await expect(page.getByText('Chỗ đang được giữ cho bạn')).toBeVisible();
  await page.getByRole('button', { name: 'Tiếp tục thanh toán' }).click();
  await page.getByLabel('ZaloPay', { exact: true }).check();
  await page.getByRole('button', { name: /Khởi tạo thanh toán/ }).click();
  await expect(page.getByRole('heading', { name: /Cổng thanh toán DEMO ZALOPAY/ })).toBeVisible();
  await page.getByRole('button', { name: 'Mô phỏng thành công' }).click();
  await expect(page.getByRole('heading', { name: 'Thanh toán đã được xác nhận' })).toBeVisible();
  const bookings = await api(page, '/bookings');
  const booking = bookings.find((b: any) => b.status === 'paid' && b.tripId === ids.activeTrip);
  // Invoice endpoint is the same action called from the result screen.
  const invoice = await api(page, '/bookings/' + booking.id + '/invoice', 'POST');
  expect(invoice.kind).toBe('demo');
  await page.goto('/account/tickets');
  await page.getByRole('link', { name: 'Xem vé', exact: true }).first().click();
  await expect(page.getByAltText('Mã QR vé điện tử')).toBeVisible();
  const ticketToken = await page.getByLabel('Token vé — dùng nhập mã thủ công').inputValue();
  await page.goto('/account/passes');
  await page.getByLabel('Tuyến đăng ký').selectOption(ids.route);
  await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();
  await page.getByLabel('Phương thức thanh toán').selectOption('MoMo');
  await page.getByRole('button', { name: 'Thanh toán vé tháng' }).click();
  await page.getByRole('button', { name: 'Mô phỏng thành công' }).click();
  await expect(page.getByAltText('Mã QR vé điện tử')).toBeVisible();
  const oldPass = (await api(page, '/passes')).passes[0];
  await page.getByRole('button', { name: 'Gia hạn thêm 30 ngày' }).click();
  await page.getByLabel('Phương thức thanh toán').selectOption('VNPay');
  await page.getByRole('button', { name: 'Thanh toán vé tháng' }).click();
  await page.getByRole('button', { name: 'Mô phỏng thành công' }).click();
  await expect(page.getByAltText('Mã QR vé điện tử')).toBeVisible();
  const pass = (await api(page, '/passes')).passes[0];
  expect(Date.parse(pass.expiresAt) - Date.parse(oldPass.expiresAt)).toBe(30 * 86400000);
  const crewContext = await browser.newContext();
  const crewPage = await crewContext.newPage();
  await login(crewPage, 'conductor');
  const scan = await api(crewPage, '/ticket-validations', 'POST', {
    tripId: ids.activeTrip,
    token: ticketToken,
  });
  expect(scan.valid).toBe(true);
  const passScan = await api(crewPage, '/ticket-validations', 'POST', {
    tripId: ids.activeTrip,
    token: pass.token,
  });
  expect(passScan.valid).toBe(true);
  const roster = await api(crewPage, '/ticket-validations/checked-in?tripId=' + ids.activeTrip);
  expect(roster.some((r: any) => r.ticketId === pass.id)).toBe(true);
  await crewPage.goto('/staff/scan?tripId=' + ids.activeTrip);
  await expect(crewPage.getByRole('heading', { level: 1 })).toBeVisible();
  await crewContext.close();
  expect(errors).toEqual([]);
});
test('API demo: manager operations, strategy, finance exports, Marketing and Admin RBAC', async ({
  page,
}) => {
  await login(page, 'manager');
  await page.goto('/admin/schedules');
  await expect(page.getByRole('heading', { name: 'Lịch mẫu & tần suất theo ngày' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Đổi giờ chuyến & thông báo' })).toBeVisible();
  await page.goto('/admin/assignments');
  await page.getByRole('button', { name: 'Thêm mới', exact: true }).click();
  await expect(page.getByLabel('Phụ xe (tùy chọn)', { exact: true })).toBeVisible();
  await page.goto('/admin/routes');
  await expect(page.getByRole('heading', { name: /Chính sách giá/ })).toBeVisible();
  await page.goto('/admin/reports');
  await expect(page.getByRole('heading', { name: 'Phân tích & dự báo nhu cầu' })).toBeVisible();
  const strategies = await api(
    page,
    '/reports/strategy?from=2026-01-01&to=2026-12-31&forecastDate=2026-10-13'
  );
  expect(strategies.sampleTrips).toBeGreaterThan(0);
  expect(strategies.forecasts.length).toBeGreaterThan(0);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Excel', exact: true }).click();
  const spreadsheet = await download;
  expect(spreadsheet.suggestedFilename()).toMatch(/\.xlsx$/);
  mkdirSync('../backend/demo-output/evidence', { recursive: true });
  await spreadsheet.saveAs('../backend/demo-output/evidence/report.xlsx');
  const pdf = page.waitForEvent('download');
  await page.getByRole('button', { name: 'PDF', exact: true }).click();
  const document = await pdf;
  expect(document.suggestedFilename()).toMatch(/\.pdf$/);
  await document.saveAs('../backend/demo-output/evidence/report.pdf');
  expect(readFileSync('../backend/demo-output/evidence/report.pdf').subarray(0, 5).toString()).toBe(
    '%PDF-'
  );
  await page.screenshot({ path: '../backend/demo-output/evidence/reports.png', fullPage: true });
  await page.getByRole('button', { name: 'Đăng xuất' }).click();
  await expect(page.getByRole('button', { name: 'Đăng xuất' })).toHaveCount(0);
  await login(page, 'marketing');
  await page.goto('/admin/promotions');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.goto('/admin/reports');
  await expect(page.getByRole('heading', { name: 'Bạn chưa có quyền truy cập' })).toBeVisible();
  await page.getByRole('button', { name: 'Đăng xuất' }).click();
  await expect(page.getByRole('button', { name: 'Đăng xuất' })).toHaveCount(0);
  await login(page, 'admin');
  await page.goto('/admin/users');
  await expect(page.getByRole('button', { name: /Tạo tài khoản/ })).toBeVisible();
  await page.goto('/admin/audit-logs');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('API demo: cancellation, exchange, eligible fare, incident notification and trip feedback', async ({
  page,
  browser,
}) => {
  const prepared = JSON.parse(readFileSync('../backend/demo-output/prepared.json', 'utf8'));
  await login(page, 'passenger');
  for (const ticket of prepared.tickets) {
    await page.goto(ticket.url);
    await page
      .getByRole('button', {
        name: ticket.purpose === 'cancel' ? 'Yêu cầu hủy vé' : 'Yêu cầu đổi chuyến',
        exact: true,
      })
      .click();
    if (ticket.purpose === 'exchange')
      await page.getByLabel('Chuyến muốn đổi').selectOption(ids.exchangeTrip);
    await page.getByRole('button', { name: 'Gửi yêu cầu', exact: true }).click();
    await expect(page.getByText(/Đang chờ điều hành xử lý yêu cầu/)).toBeVisible();
  }
  const context = await browser.newContext(),
    manager = await context.newPage();
  await login(manager, 'manager');
  await manager.goto('/admin/support');
  await manager.getByRole('button', { name: 'Duyệt', exact: true }).first().click();
  await expect(manager.getByRole('button', { name: 'Duyệt', exact: true })).toHaveCount(1);
  await manager.getByRole('button', { name: 'Duyệt', exact: true }).click();
  await expect(manager.getByText('Chưa có yêu cầu vé')).toBeVisible();
  const canceled = prepared.tickets.find((t: any) => t.purpose === 'cancel'),
    exchanged = prepared.tickets.find((t: any) => t.purpose === 'exchange');
  expect((await api(page, '/bookings/' + canceled.bookingId)).refund).toBe('refunded');
  expect((await api(page, '/tickets/' + exchanged.ticketId)).tripId).toBe(ids.exchangeTrip);
  await manager.goto('/admin/eligibility');
  await manager.getByRole('button', { name: 'Duyệt ưu đãi' }).click();
  await expect(manager.getByText('Không có hồ sơ đang chờ')).toBeVisible();
  const policy = (await api(page, '/passes')).policy;
  expect(policy.category).toBe('STUDENT');
  expect(policy.monthlyPrice).toBe(150000);
  await page.goto('/tracking/' + ids.activeTrip);
  await page.getByLabel('Trạm đón', { exact: true }).selectOption(ids.stops[1].id);
  await page.getByLabel('Trạm xuống', { exact: true }).selectOption(ids.stops[2].id);
  await page.getByRole('button', { name: 'Nhận thông báo trạm' }).click();
  await api(manager, '/trips/' + ids.activeTrip + '/delay', 'POST', { minutes: 10 });
  await page.goto('/account/notifications');
  await expect(page.getByText('Cập nhật trễ chuyến', { exact: true })).toBeVisible();
  await page.goto('/account/support');
  await page.getByLabel('Tiêu đề').fill('Đánh giá demo API');
  await page.getByLabel('Nội dung phản ánh').fill('Tôi đã dùng vé và cần hỗ trợ trạm đón.');
  await page.getByLabel('Chuyến được đánh giá (tùy chọn)').selectOption(ids.exchangeTrip);
  await page.getByRole('button', { name: 'Gửi phản ánh' }).click();
  await expect(page.getByRole('heading', { name: 'Đánh giá demo API' })).toBeVisible();
  await manager.goto('/admin/support');
  await manager.getByRole('button', { name: 'Trả lời phản ánh' }).click();
  await manager
    .getByLabel('Nội dung phản hồi')
    .fill('Nhà xe đã nhận phản ánh và sẽ hỗ trợ tại trạm.');
  await manager.getByRole('button', { name: 'Gửi phản hồi trong ứng dụng' }).click();
  await expect(manager.getByText('Đã phản hồi', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText(/Nhà xe đã nhận phản ánh/)).toBeVisible();
  await context.close();
});

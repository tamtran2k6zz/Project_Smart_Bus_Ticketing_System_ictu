import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import ExcelJS from 'exceljs';
const { Workbook } = ExcelJS;
const tomorrow = () =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).format(
    new Date(Date.now() + 86400000)
  );
async function login(page: Page, role = 'Hành khách') {
  await page.goto('/login');
  await page.getByRole('button', { name: role, exact: true }).click();
  await expect(page.getByRole('button', { name: 'Đăng xuất' })).toBeVisible();
}
async function chooseSeat(page: Page) {
  await page.goto('/booking/t-1-1-0');
  await page.getByRole('button', { name: 'Ghế 01', exact: true }).click();
  await page.getByRole('button', { name: 'Giữ chỗ 10 phút' }).click();
  await expect(page.getByText('Chỗ đang được giữ cho bạn')).toBeVisible();
  await page.getByRole('button', { name: 'Tiếp tục thanh toán' }).click();
  await expect(page).toHaveURL(/checkout/);
}
async function startPayment(page: Page) {
  await page.getByRole('button', { name: /Khởi tạo giao dịch demo/ }).click();
  await expect(page.getByRole('button', { name: 'Mô phỏng thành công' })).toBeVisible();
}
async function paidTicket(page: Page) {
  await chooseSeat(page);
  await startPayment(page);
  await page.getByRole('button', { name: 'Mô phỏng thành công' }).click();
  await expect(page.getByRole('heading', { name: 'Thanh toán đã được xác nhận' })).toBeVisible();
  await page.goto('/account/tickets');
  await page.getByRole('link', { name: 'Xem vé', exact: true }).click();
  await expect(page.getByAltText('Mã QR vé điện tử')).toBeVisible();
  return page.getByLabel('Token vé — dùng nhập mã thủ công').inputValue();
}
test('landing responsive, keyboard, mobile menu, FAQ and reduced motion', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await mkdir('test-results/screenshots', { recursive: true });
  for (const width of [360, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Đi xe buýt');
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('[data-hero-bus]')).toHaveCSS('opacity', '1');
    await expect(page.locator('[data-hero-card]').first()).toHaveCSS('opacity', '1');
    await expect(page.getByAltText(/Xe buýt TAMBUS/)).toBeVisible();
    if (width >= 1280) {
      const dateControl = await page.getByLabel('Ngày khởi hành').boundingBox();
      const timeControl = await page.getByLabel('Từ giờ').boundingBox();
      expect(dateControl!.width).toBeGreaterThanOrEqual(210);
      expect(timeControl!.width).toBeGreaterThanOrEqual(145);
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
    ).toBe(true);
    await page.screenshot({
      path: 'test-results/screenshots/landing-' + width + '.png',
      fullPage: true,
    });
    await page.screenshot({ path: 'test-results/screenshots/hero-' + width + '.png' });
    if (width === 360) {
      await page.getByRole('button', { name: 'Mở menu' }).click();
      await expect(page.getByRole('navigation', { name: 'Điều hướng chính' })).toBeVisible();
      await page.getByRole('button', { name: 'Đóng menu' }).click();
    }
  }
  await page.getByRole('button', { name: 'Tôi có thể hủy hoặc đổi vé không?' }).click();
  await expect(page.locator('#faq-2')).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('[data-hero-bus]')).toHaveCSS('opacity', '1');
  await expect(page.locator('[data-hero-bus]')).toHaveCSS('transform', 'none');
  await page.keyboard.press('Tab');
  await expect(page.getByText('Bỏ qua tới nội dung')).toBeFocused();
  expect(errors).toEqual([]);
});
test('landing form forwards query and login preserves booking redirect', async ({ page }) => {
  await page.goto('/');
  await page
    .getByLabel('Điểm đi', { exact: true })
    .selectOption({ label: 'Bến xe trung tâm Thái Nguyên' });
  await page.getByLabel('Điểm đến', { exact: true }).selectOption({ label: 'Hồ Núi Cốc' });
  await page.getByLabel('Ngày khởi hành').fill(tomorrow());
  await page.getByRole('button', { name: 'Tìm chuyến', exact: true }).click();
  await expect(page).toHaveURL(/from=.*to=.*date=/);
  await expect(page.getByRole('link', { name: 'Xem chuyến' }).first()).toBeVisible();
  await page.getByRole('link', { name: 'Xem chuyến' }).first().click();
  await page.getByRole('link', { name: 'Đặt vé chuyến này' }).click();
  await expect(page).toHaveURL(/login\?redirect=/);
  await page.getByRole('button', { name: 'Hành khách', exact: true }).click();
  await expect(page).toHaveURL(/booking/);
});
test('hold refresh, pending callback forgery, failed retry, paid QR and reused check-in', async ({
  page,
}) => {
  await login(page);
  await chooseSeat(page);
  const checkout = page.url();
  await page.reload();
  await expect(page.getByText('Chỗ đang được giữ cho bạn')).toBeVisible();
  await startPayment(page);
  await page.getByRole('button', { name: 'Giữ trạng thái chờ' }).click();
  await expect(page.getByRole('heading', { name: 'Đang chờ xác nhận' })).toBeVisible();
  const resultUrl = page.url();
  await page.goto(resultUrl + '&status=paid&success=true');
  await expect(page.getByRole('heading', { name: 'Đang chờ xác nhận' })).toBeVisible();
  await page.goto(checkout);
  await page.getByRole('button', { name: 'Mô phỏng thất bại' }).click();
  await expect(page.getByRole('heading', { name: 'Thanh toán chưa thành công' })).toBeVisible();
  await page.goto(checkout);
  await startPayment(page);
  await page.getByRole('button', { name: 'Mô phỏng thành công' }).click();
  await page.goto('/account/tickets');
  await page.getByRole('link', { name: 'Xem vé', exact: true }).click();
  const token = await page.getByLabel('Token vé — dùng nhập mã thủ công').inputValue();
  await expect(page.getByAltText('Mã QR vé điện tử')).toBeVisible();
  await page.getByRole('button', { name: 'Đăng xuất' }).click();
  await login(page, 'Quản trị viên');
  await page.goto('/staff/scan?tripId=t-1-1-0');
  await page.getByLabel('Token từ vé QR').fill('QR-sai');
  await page.getByRole('button', { name: 'Xác thực & ghi nhận lên xe' }).click();
  await expect(page.getByRole('alert')).toContainText('không hợp lệ');
  await page.getByLabel('Token từ vé QR').fill(token);
  await page.getByRole('button', { name: 'Xác thực & ghi nhận lên xe' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Vé hợp lệ' })).toBeVisible();
  await page.getByRole('button', { name: 'Xác thực & ghi nhận lên xe' }).click();
  await expect(page.getByRole('alert')).toContainText('đã được sử dụng');
});
test('expiry survives refresh, unassigned seats and tracking reconnect', async ({ page }) => {
  await login(page);
  await page.goto('/booking/t-1-0-0');
  await page.getByLabel('Số vé (tối đa 6)').selectOption('2');
  await page.getByRole('button', { name: 'Giữ chỗ 10 phút' }).click();
  await expect(page.getByText('Chỗ đang được giữ cho bạn')).toBeVisible();
  await page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('smartbus.demo.v1')!);
    db.holds.forEach(
      (h: { expiresAt: string }) => (h.expiresAt = new Date(Date.now() - 1000).toISOString())
    );
    localStorage.setItem('smartbus.demo.v1', JSON.stringify(db));
  });
  await page.reload();
  await expect(page.getByText('Giữ chỗ đã hết hạn', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tiếp tục thanh toán' })).toBeDisabled();
  await page.goto('/tracking/t1');
  await expect(page.getByText('Đang cập nhật', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Mô phỏng mất tín hiệu' }).click();
  await expect(page.getByText('Chưa có tín hiệu', { exact: true })).toBeVisible();
  await expect(
    page.getByText('Vị trí được giữ tại lần nhận cuối. ETA tạm ngừng khi mất tín hiệu.')
  ).toBeVisible();
  await page.getByRole('button', { name: 'Kết nối lại demo' }).click();
  await expect(page.getByText('Đang cập nhật', { exact: true })).toBeVisible();
});
test('direct route permissions, admin CRUD and modal keyboard', async ({ page }) => {
  await login(page);
  await page.goto('/admin/users');
  await expect(page).toHaveURL('/403');
  await page.getByRole('button', { name: 'Đăng xuất' }).click();
  await login(page, 'Quản trị viên');
  await page.goto('/admin/stops');
  await page.getByRole('button', { name: 'Thêm mới' }).click();
  await page.getByLabel('Tên trạm').fill('Trạm thử nghiệm');
  await page.getByLabel('Địa chỉ').fill('Thái Nguyên, Demo');
  await page.getByRole('button', { name: 'Lưu bản ghi' }).click();
  await expect(page.getByRole('cell', { name: 'Trạm thử nghiệm', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Sửa Trạm thử nghiệm' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Sửa Trạm thử nghiệm' })).toBeFocused();
  await page.getByRole('button', { name: 'Xóa Trạm thử nghiệm' }).click();
  await page.getByRole('button', { name: 'Xác nhận xóa' }).click();
  await expect(page.getByRole('cell', { name: 'Trạm thử nghiệm', exact: true })).not.toBeVisible();
  await page.goto('/admin/users');
  await page.getByRole('button', { name: 'Chỉnh quyền' }).first().click();
  await page.getByLabel('Vai trò').selectOption('FINANCE');
  await page.getByLabel('Voucher', { exact: true }).uncheck();
  await page.getByRole('button', { name: 'Lưu quyền' }).click();
});
test('report exports match filters and PDF has Vietnamese data', async ({ page }) => {
  await login(page);
  await paidTicket(page);
  await page.getByRole('button', { name: 'Đăng xuất' }).click();
  await login(page, 'Quản trị viên');
  await page.goto('/admin/reports');
  await page.getByLabel('Từ ngày').fill(tomorrow());
  await page.getByLabel('Đến ngày').fill(tomorrow());
  await page.getByLabel('Tuyến xe').selectOption('r2');
  await page.getByRole('button', { name: 'Áp dụng bộ lọc' }).click();
  await expect(page.getByText('Đang áp dụng:', { exact: false })).toContainText('r2');
  const excelEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Excel', exact: true }).click();
  const excel = await excelEvent;
  const path = await excel.path();
  const workbook = new Workbook();
  await workbook.xlsx.readFile(path!);
  const sheet = workbook.getWorksheet('Doanh thu')!;
  expect(sheet.getCell('B3').value).toBe(25000);
  expect(sheet.getCell('C5').value).toBe('r2');
  expect(sheet.getCell('D5').value).toBe(25000);
  const pdfEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'PDF', exact: true }).click();
  const pdf = await pdfEvent;
  await pdf.saveAs('test-results/report-demo.pdf');
  expect(await pdf.path()).toBeTruthy();
});
test('all admin/passenger/staff screens render without runtime errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await login(page, 'Quản trị viên');
  for (const path of [
    '/admin',
    '/admin/routes',
    '/admin/stops',
    '/admin/schedules',
    '/admin/vehicles',
    '/admin/staff',
    '/admin/assignments',
    '/admin/reports',
    '/admin/promotions',
    '/admin/eligibility',
    '/admin/users',
    '/admin/audit-logs',
    '/admin/support',
    '/staff/trips',
    '/staff/scan',
    '/staff/incidents',
    '/account/passes',
    '/account/notifications',
    '/account/support',
    '/account/profile',
  ]) {
    await page.goto(path);
    await expect(page.locator('main h1')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Không thể hiển thị SmartBus' })
    ).not.toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Không thể hiển thị SmartBus' })
    ).not.toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
    ).toBe(true);
  }
  expect(errors).toEqual([]);
});

test('pass eligibility, support reply, cancellation refund and notifications stay linked', async ({
  page,
}) => {
  test.slow();
  await login(page);
  await paidTicket(page);
  await page.getByRole('button', { name: 'Yêu cầu hủy vé' }).click();
  await page.getByRole('button', { name: 'Gửi yêu cầu', exact: true }).click();
  await expect(page.getByText('Đang chờ điều hành xử lý yêu cầu hủy.')).toBeVisible();
  await page.goto('/account/passes');
  await page.getByLabel('Mã giấy tờ demo').fill('DEMO-SV001');
  await page.getByRole('button', { name: 'Gửi hồ sơ ưu đãi' }).click();
  await expect(page.getByText('Chờ duyệt', { exact: true })).toBeVisible();
  await page.getByLabel('Tuyến đăng ký').selectOption('r1');
  await page.getByRole('button', { name: 'Đăng ký demo', exact: true }).click();
  await page.getByRole('button', { name: 'Xác nhận demo' }).click();
  await expect(page.getByText('Đang hoạt động', { exact: true })).toBeVisible();
  await page.goto('/account/support');
  await page.getByLabel('Tiêu đề').fill('Cần hỗ trợ chuyến xe');
  await page.getByLabel('Nội dung phản ánh').fill('Tôi muốn hỏi thông tin điểm đón của chuyến xe.');
  await page.getByRole('button', { name: 'Gửi phản ánh' }).click();
  await expect(page.getByRole('heading', { name: 'Cần hỗ trợ chuyến xe' })).toBeVisible();
  await page.getByRole('button', { name: 'Đăng xuất' }).click();
  await login(page, 'Quản trị viên');
  await page.goto('/admin/eligibility');
  await page.getByRole('button', { name: 'Duyệt ưu đãi' }).click();
  await expect(page.getByText('Không có hồ sơ đang chờ')).toBeVisible();
  await page.goto('/admin/support');
  await page.getByRole('button', { name: 'Duyệt', exact: true }).click();
  await expect(page.getByText('Chưa có yêu cầu vé')).toBeVisible();
  await page.getByRole('button', { name: 'Trả lời phản ánh' }).click();
  await page
    .getByLabel('Nội dung phản hồi')
    .fill('Điểm đón ở bến xe trung tâm, vui lòng có mặt trước 10 phút.');
  await page.getByRole('button', { name: 'Gửi phản hồi trong ứng dụng' }).click();
  await expect(page.getByText('Đã phản hồi', { exact: true })).toBeVisible();
  await page.goto('/admin/reports');
  await page.getByRole('button', { name: 'Xác nhận hoàn demo' }).click();
  await expect(page.getByText('Đã hoàn demo', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Đăng xuất' }).click();
  await login(page);
  await page.goto('/account/tickets');
  await expect(page.getByText('Đã hủy', { exact: true }).first()).toBeVisible();
  await page.goto('/account/notifications');
  await expect(page.getByText('Hoàn tiền demo hoàn tất', { exact: true })).toBeVisible();
  await expect(page.getByText('Phản ánh đã được trả lời', { exact: true })).toBeVisible();
  await expect(page.getByText('Hồ sơ ưu đãi đã được xử lý', { exact: true })).toBeVisible();
});

test('portal layouts fit all target viewports', async ({ page }) => {
  test.slow();
  await login(page, 'Quản trị viên');
  for (const width of [360, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      '/admin/reports',
      '/admin/routes',
      '/account/passes',
      '/staff/scan',
      '/booking/t-1-1-0',
      '/tracking/t1',
    ]) {
      await page.goto(path);
      await expect(page.locator('main h1')).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        width + 'px ' + path
      ).toBe(true);
    }
  }
});

test('registration, profile validation and forgot-password demo', async ({ page }) => {
  await page.goto('/register');
  await page.getByLabel('Họ tên').fill('Hành khách thử nghiệm');
  await page.getByLabel('Số điện thoại').fill('0905551234');
  await page.getByLabel('Email', { exact: true }).fill('test@smartbus.demo');
  await page.getByLabel('Mật khẩu', { exact: true }).fill('SmartBus123!');
  await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();
  await expect(page).toHaveURL('/account/tickets');
  await page.goto('/account/profile');
  await page.getByLabel('Số điện thoại').fill('123');
  await page.getByRole('button', { name: 'Lưu thông tin' }).click();
  await expect(page.getByText('Số điện thoại không hợp lệ')).toBeVisible();
  await page.getByLabel('Số điện thoại').fill('0909998888');
  await page.getByRole('button', { name: 'Lưu thông tin' }).click();
  await expect(page.getByText('Đã cập nhật hồ sơ.')).toBeVisible();
  await page.getByRole('button', { name: 'Đăng xuất' }).click();
  await page.goto('/forgot-password');
  await page.getByLabel('Email', { exact: true }).fill('test@smartbus.demo');
  await page.getByRole('button', { name: 'Gửi yêu cầu', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Demo không gửi email' })).toBeVisible();
});

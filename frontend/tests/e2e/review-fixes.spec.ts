import { test, expect } from '@playwright/test';
const day = () =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
const tomorrow = () =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).format(
    new Date(Date.now() + 86400000)
  );
test('direct search agrees with date and tablet time control is usable', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto('/trips');
  await expect(page.getByLabel('Ngày khởi hành')).toHaveValue(day());
  await expect(page.getByText('18 chuyến được tìm thấy')).toBeVisible();
  await expect(page.locator('article').first()).toContainText(
    new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(
      new Date()
    )
  );
  const rect = await page.getByLabel('Từ giờ').boundingBox();
  expect(rect!.width).toBeGreaterThan(140);
  await page.getByLabel('Từ giờ').fill('10:30');
  await expect(page.getByLabel('Từ giờ')).toHaveValue('10:30');
});
test('intermediate journey reaches checkout and expired QR disappears without reload', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Hành khách', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Đăng xuất' })).toBeVisible();
  await page.goto('/trips');
  await page.getByLabel('Điểm đi', { exact: true }).selectOption({ label: 'Đại học ICTU' });
  await page.getByLabel('Điểm đến', { exact: true }).selectOption({ label: 'Hồ Núi Cốc' });
  await page.getByLabel('Ngày khởi hành').fill(tomorrow());
  await page.getByRole('button', { name: 'Tìm chuyến', exact: true }).click();
  await expect(page.getByText('6 chuyến được tìm thấy')).toBeVisible();
  await page.getByRole('link', { name: 'Xem chuyến' }).first().click();
  await page.getByRole('link', { name: 'Đặt vé chuyến này' }).click();
  await page.getByRole('button', { name: 'Ghế 01', exact: true }).click();
  await page.getByRole('button', { name: 'Giữ chỗ 10 phút' }).click();
  await expect(page.getByText('Chỗ đang được giữ cho bạn')).toBeVisible();
  const bookingUrl = page.url();
  const changedUrl = new URL(bookingUrl);
  changedUrl.searchParams.set('from', 'Bến xe trung tâm Thái Nguyên');
  await page.goto(changedUrl.toString());
  await expect(page.getByText(/Hành trình tìm kiếm khác với lượt giữ chỗ/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tiếp tục thanh toán' })).toBeDisabled();
  await page.goto(bookingUrl);
  await expect(page.getByRole('button', { name: 'Tiếp tục thanh toán' })).toBeEnabled();
  await page.getByRole('button', { name: 'Tiếp tục thanh toán' }).click();
  const summary = page.getByRole('region', { name: 'Thông tin chuyến đã chọn' });
  await expect(summary).toContainText('Đại học ICTU');
  await expect(summary).toContainText('Hồ Núi Cốc');
  await expect(summary).toContainText('Khởi hành tại đầu tuyến');
  await page.getByRole('button', { name: /Khởi tạo giao dịch demo/ }).click();
  await page.getByRole('button', { name: 'Mô phỏng thành công', exact: true }).click();
  await page.goto('/account/tickets');
  await page.getByRole('link', { name: 'Xem vé', exact: true }).click();
  await expect(page.getByAltText('Mã QR vé điện tử')).toBeVisible();
  await page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('smartbus.demo.v1')!);
    db.tickets[0].expiresAt = new Date(Date.now() + 1200).toISOString();
    localStorage.setItem('smartbus.demo.v1', JSON.stringify(db));
  });
  await page.reload();
  await expect(page.getByText('Vé đã hết hạn', { exact: true })).toBeVisible({ timeout: 10000 });
  await expect(page.getByAltText('Mã QR vé điện tử')).toHaveCount(0);
  await expect(page.getByLabel('Token vé — dùng nhập mã thủ công')).toHaveCount(0);
});
test('auth skip link and keyboard mobile menu have correct targets', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Đăng nhập tài khoản' })).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Bỏ qua tới nội dung' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();
  await page.getByRole('button', { name: 'Mở menu' }).click();
  await expect(page.getByRole('navigation', { name: 'Điều hướng chính' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Mở menu' })).toBeFocused();
  await expect(page.getByRole('navigation', { name: 'Điều hướng chính' })).toBeHidden();
});

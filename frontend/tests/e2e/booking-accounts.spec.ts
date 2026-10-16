import { test, expect, type Page } from '@playwright/test';

async function register(page: Page, suffix: string) {
  await page.goto('/register');
  await page.getByLabel('Họ tên').fill('Khách ' + suffix);
  await page.getByLabel('Số điện thoại').fill(suffix === 'B' ? '0905550002' : '0905550003');
  await page.getByLabel('Email', { exact: true }).fill(`booking-${suffix}@example.test`);
  await page.getByLabel('Mật khẩu', { exact: true }).fill('SmartBus123!');
  await page.getByRole('button', { name: 'Đăng ký & xác minh email', exact: true }).click();
  await expect(page).toHaveURL('/account/tickets');
}

test('A, B and C keep separate booking drafts while other passengers seats stay locked', async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto('/login');
  await page.getByRole('button', { name: /^Hành khách / }).click();
  await expect(page).toHaveURL('/account/tickets');
  await page.goto('/booking/t-1-1-0');
  await page.getByRole('button', { name: 'Ghế 01', exact: true }).click();
  await page.getByRole('button', { name: 'ĐẶT CHỖ', exact: true }).click();
  await expect(page.getByText('Chỗ đang được giữ cho bạn')).toBeVisible();
  for (const [user, seat, locked] of [
    ['B', '02', ['01']],
    ['C', '03', ['01', '02']],
  ] as const) {
    await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
    await register(page, user);
    await page.goto('/booking/t-1-1-0');
    await expect(page.getByRole('button', { name: 'Ghế ' + seat, exact: true })).toBeEnabled();
    for (const other of locked) {
      const button = page.getByRole('button', { name: 'Ghế ' + other, exact: true });
      await expect(button).toBeDisabled();
      await expect(button).toHaveAttribute('aria-pressed', 'false');
    }
    await expect(page.getByRole('button', { name: 'ĐẶT CHỖ', exact: true })).toBeDisabled();
    await expect(page.getByText(/Không tìm thấy.*giữ chỗ/)).toHaveCount(0);
    await page.getByRole('button', { name: 'Ghế ' + seat, exact: true }).click();
    await page.getByRole('button', { name: 'ĐẶT CHỖ', exact: true }).click();
    await expect(page.getByText('Chỗ đang được giữ cho bạn')).toBeVisible();
  }
  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
  await page.goto('/login');
  await page.getByRole('button', { name: /^Hành khách / }).click();
  await expect(page).toHaveURL('/account/tickets');
  await page.goto('/booking/t-1-1-0');
  await expect(page.getByText('Chỗ đang được giữ cho bạn')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ghế 01', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  await expect(page.getByRole('button', { name: 'Ghế 02', exact: true })).toHaveAttribute(
    'aria-pressed',
    'false'
  );
  await page.reload();
  await expect(page.getByText('Chỗ đang được giữ cho bạn')).toBeVisible();
});

import { test, expect } from '@playwright/test';

test('page size, arrows and page input request the correct backend slice', async ({ page }) => {
  const user = { id: 'admin', name: 'Test Secretary', roles: ['Secretary'], permissions: ['officialsPortal.loans.view'] };
  await page.addInitScript(user => { localStorage.setItem('clingrow_token', 'isolated'); localStorage.setItem('clingrow_user', JSON.stringify(user)); }, user);
  let lastQuery = { page: 0, pageSize: 0 };
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    let body: any = { data: [], unreadCount: 0 };
    if (url.pathname.endsWith('/auth/me')) body = { user };
    if (url.pathname.endsWith('/loans')) {
      const current = Number(url.searchParams.get('page') ?? 1), size = Number(url.searchParams.get('pageSize') ?? 20);
      lastQuery = { page: current, pageSize: size };
      const total = url.searchParams.get('search') ? 0 : 87;
      const data = Array.from({ length: Math.max(0, Math.min(size, total - (current - 1) * size)) }, (_, i) => {
        const number = (current - 1) * size + i + 1;
        return { id: 'l' + number, loanNumber: 'LN-ROW-' + number, member: { name: 'Member ' + number, membershipNumber: 'CG' + number }, status: 'ACTIVE', requestedAmount: 1000, approvedAmount: 1000, applicationDate: '2026-07-01', disbursedAt: '2026-07-01', totalOutstanding: 1000, interestCharges: [], repayments: [], penalties: [] };
      });
      body = { data, meta: { page: current, pageSize: size, total, totalPages: Math.max(1, Math.ceil(total / size)) }, summary: { total, totalOutstanding: total ? 628612.12 : 0, activeCount: total ? 15 : 0, approvalQueue: 0, atRisk: 0 } };
    }
    await route.fulfill({ json: body });
  });
  await page.goto('/officials/loans');
  const footer = page.getByRole('navigation', { name: 'Table pagination' });
  await expect(footer.getByRole('combobox', { name: 'Rows per page' })).toHaveValue('50');
  await expect(page.getByText('Showing 1 to 50 of 87', { exact: true })).toBeVisible();
  await expect(footer.getByRole('button', { name: 'First page' })).toBeDisabled();
  await footer.getByRole('combobox').selectOption('10');
  await expect.poll(() => lastQuery).toEqual({ page: 1, pageSize: 10 });
  await expect(page.locator('tbody tr')).toHaveCount(10);
  await footer.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByText('Showing 11 to 20 of 87', { exact: true })).toBeVisible();
  await footer.getByRole('button', { name: 'Last page' }).click();
  await expect.poll(() => lastQuery).toEqual({ page: 9, pageSize: 10 });
  await expect(page.getByText('Showing 81 to 87 of 87', { exact: true })).toBeVisible();
  await expect(footer.getByRole('button', { name: 'Next', exact: true })).toBeDisabled();
  await footer.getByRole('textbox', { name: 'Page number' }).fill('3');
  await footer.getByRole('textbox', { name: 'Page number' }).press('Enter');
  await expect.poll(() => lastQuery).toEqual({ page: 3, pageSize: 10 });
  await expect(page.getByText('Showing 21 to 30 of 87', { exact: true })).toBeVisible();
  await footer.getByRole('combobox').selectOption('50');
  await expect.poll(() => lastQuery).toEqual({ page: 1, pageSize: 50 });
  await expect(page.getByText('KES 628,612.12', { exact: true })).toBeVisible();
  await expect(page.getByText('Showing 1 to 50 of 87', { exact: true })).toBeVisible();
  await footer.screenshot({ path: '../outputs/table-pagination-20261007.png' });
  await page.getByPlaceholder('Search member or loan number').fill('no-match');
  await expect(page.getByText('Showing 0 to 0 of 0', { exact: true })).toBeVisible();
  await expect(footer.getByRole('button', { name: 'Next', exact: true })).toBeDisabled();
});

test('tables with fully loaded records paginate locally and reset after filtering', async ({ page }) => {
  const user = { id: 'admin', name: 'Test Secretary', roles: ['Secretary'], permissions: ['ledger.journal.view'] };
  await page.addInitScript(user => { localStorage.setItem('clingrow_token', 'isolated'); localStorage.setItem('clingrow_user', JSON.stringify(user)); }, user);
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    let body: any = { data: [], funds: [], unreadCount: 0, meta: { total: 0 } };
    if (path.endsWith('/auth/me')) body = { user };
    if (path.endsWith('/ledger/accounts')) body = { accounts: Array.from({ length: 65 }, (_, i) => ({ id: 'a' + i, code: String(1000 + i), name: 'Account ' + (i + 1), type: 'ASSET', isSystemAccount: true })) };
    await route.fulfill({ json: body });
  });
  await page.goto('/officials/ledger?tab=accounts');
  const footer = page.getByRole('navigation', { name: 'Table pagination' });
  await expect(page.getByText('Showing 1 to 50 of 65', { exact: true })).toBeVisible();
  await expect(page.locator('tbody tr')).toHaveCount(50);
  await footer.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByText('Showing 51 to 65 of 65', { exact: true })).toBeVisible();
  await expect(page.locator('tbody tr')).toHaveCount(15);
  await footer.getByRole('combobox').selectOption('10');
  await expect(page.getByText('Showing 1 to 10 of 65', { exact: true })).toBeVisible();
  await footer.getByRole('button', { name: 'Last page' }).click();
  await expect(page.getByText('Showing 61 to 65 of 65', { exact: true })).toBeVisible();
  await page.getByPlaceholder('Search account code, name, type, or fund').fill('Account 65');
  await expect(page.getByText('Showing 1 to 1 of 1', { exact: true })).toBeVisible();
  await expect(footer.getByRole('textbox', { name: 'Page number' })).toHaveValue('1');
  await expect(footer.getByRole('button', { name: 'Next', exact: true })).toBeDisabled();
});

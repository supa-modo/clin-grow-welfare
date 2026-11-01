import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
const user = { id: 'user-own', name: 'Amina Member', memberId: 'own', memberConstitutionAccepted: true, roles: ['Member'], permissions: [] };
const year = { id: 'fy', name: 'FY2026', startDate: '2026-01-01T00:00:00Z', endDate: '2026-12-20T20:59:59Z' };
const summary = { id: 'own', firstName: 'Amina', name: 'Amina Member', membershipNumber: 'CG007', status: 'ACTIVE', registrationFeePaid: true, dateJoined: '2026-01-01', financialYear: year,
  financialSummary: { shareCapital: 5000, weeklySavings: 20000.75, welfareKitty: 2000, loanEligibilityBase: 25000.75, activeLoanBalance: 3500.25, finesBalance: 100 } };
const distribution = { enabled: true, status: 'ESTIMATE', method: 'CLOSING_CAPITAL', financialYear: year, calculatedAt: '2026-11-01T08:00:00Z',
  member: { name: 'Amina Member', membershipNumber: 'CG007', shareCapital: 5000, savings: 20000.75, capital: 25000.75 },
  group: { capital: 100003, memberCount: 4, shareablePool: 1000, breakdown: { interest: 950, fines: 150, otherIncome: 25, income: 1125, expenses: 100, adjustments: 25 } },
  allocation: { percentage: 25, currentShare: 250, projectedShare: 250, totalWithCapital: 25250.75 }, assumptions: ['No future income or contributions are assumed.'] };
async function setup(page: Page, admin = false) {
  const identity = admin ? { ...user, memberId: null, roles: ['SystemAdmin'] } : user;
  const state = { visible: true, distributionFailure: false, summaryFailure: false, visibilityFailure: false, historyPages: [] as number[], visibilityWrites: [] as boolean[] };
  await page.addInitScript(user => { localStorage.setItem('clingrow_token', 'test-session'); localStorage.setItem('clingrow_user', JSON.stringify(user)); }, identity);
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url()); const path = url.pathname;
    let body: unknown = { notifications: [], count: 0 };
    if (path.endsWith('/auth/me')) body = { user: identity };
    if (path.endsWith('/member-portal/dashboard')) {
      if (state.summaryFailure) return route.fulfill({ status: 500, json: { error: 'Unavailable' } });
      body = { summary };
    }
    if (path.endsWith('/member-portal/distribution')) {
      if (state.distributionFailure) return route.fulfill({ status: 500, json: { error: 'Unavailable' } });
      body = state.visible ? distribution : { enabled: false };
    }
    if (path.endsWith('/member-portal/distribution/history')) {
      const current = Number(url.searchParams.get('page') ?? 1); state.historyPages.push(current);
      body = { page: current, pageSize: 20, total: 25, rows: [{ reference: `JE-${current}`, date: '2026-10-22T12:00:00Z', meeting: 'MTG20260034', shareCapital: current === 1 ? 500 : -100, savings: 450.75 }] };
    }
    if (path.endsWith('/member-portal/loans')) body = { loans: [{ id: 'loan-1', loanNumber: 'LN202600021', disbursedAt: '2026-10-01', status: 'ACTIVE', totalOutstanding: 3500.25 }] };
    if (path.endsWith('/member-portal/meetings')) body = { meetings: [{ id: 'meeting-next', meetingNumber: 'MTG20260035', status: 'SCHEDULED', meetingDate: new Date(Date.now() + 3 * 86400000).toISOString(), venue: 'Clin-Grow Hall' }] };
    if (path.endsWith('/member-portal/contributions')) body = { data: [{ id: 'contribution-1', contributionType: 'WEEKLY_SAVINGS', amount: 450.75, status: 'POSTED', periodDate: '2026-10-22', meeting: { meetingNumber: 'MTG20260034' } }], meta: { total: 1 } };
    if (path.endsWith('/member-portal/contributions/weekly-savings-trend')) body = { months: 6, points: [{ date: '2026-09-01', label: 'Sep', amount: 1200 }, { date: '2026-10-01', label: 'Oct', amount: 1450.75 }] };
    if (path.endsWith('/ledger/system-settings')) body = { financialYear: { ...year, status: 'OPEN', settings: { memberDistributionVisible: state.visible, voucherManagementApproverRoles: ['CHAIRPERSON'], voucherRequiredSignatoryRoles: ['TREASURER', 'CHAIRPERSON'] } } };
    if (path.endsWith('/ledger/member-distribution-visibility')) {
      if (route.request().method() === 'PUT') {
        const value = route.request().postDataJSON().visible; state.visibilityWrites.push(value);
        if (state.visibilityFailure) return route.fulfill({ status: 500, json: { error: 'Unable to save visibility' } });
        state.visible = value;
      }
      body = { financialYearId: 'fy', financialYearName: 'FY2026', visible: state.visible };
    }
    await route.fulfill({ json: body });
  });
  return state;
}

test('dashboard shows real balances, a private estimate and no pending-actions warning bar', async ({ page }) => {
  await setup(page); await page.goto('/member');
  await expect(page.getByRole('heading', { name: /Amina/ })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Your capital' }).getByText('KES 25,000.75', { exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Distribution preview' }).getByText('KES 250.00', { exact: true })).toBeVisible();
  await expect(page.getByText('KES 3,500.25', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Clin-Grow Hall', { exact: true })).toBeVisible();
  await expect(page.getByText(/pending actions|review required|past meeting.s. unpaid/i)).toHaveCount(0);
  await page.screenshot({ path: '../outputs/member-dashboard-desktop.png', fullPage: true });
  await page.getByRole('link', { name: 'View more', exact: true }).click();
  await expect(page).toHaveURL(/\/member\/distribution$/);
  await expect(page.getByRole('heading', { name: 'Your distribution, explained' })).toBeVisible();
});

test('off hides the dashboard amount and blocks the direct detail route and history', async ({ page }) => {
  const state = await setup(page); state.visible = false;
  await page.goto('/member');
  await expect(page.getByRole('heading', { name: /Amina/ })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Distribution preview' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'View more', exact: true })).toHaveCount(0);
  await page.goto('/member/distribution');
  await expect(page).toHaveURL(/\/member$/);
  expect(state.historyPages).toHaveLength(0);
});

test('details explain the default formula and lazily load only own capital movements', async ({ page }) => {
  const state = await setup(page); await page.goto('/member/distribution');
  await expect(page.getByRole('heading', { name: 'Your distribution, explained' })).toBeVisible();
  await expect(page.getByText('Default capital-based formula', { exact: true })).toBeVisible();
  await expect(page.getByText('Member CG007', { exact: false })).toBeVisible();
  await expect(page.getByText('Recorded loan interest, net of reversals', { exact: true })).toBeVisible();
  await expect(page.getByText('Recorded fine income', { exact: true })).toBeVisible();
  await expect(page.getByText(/The columns match because/)).toBeVisible();
  expect(state.historyPages).toHaveLength(0);
  await page.getByRole('button', { name: /Your contribution history/ }).click();
  await expect(page.getByText('MTG20260034', { exact: true })).toBeVisible();
  await expect(page.getByText('KES 450.75', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByText('JE-2', { exact: true })).toBeVisible();
  expect(state.historyPages).toContain(2);
  await page.screenshot({ path: '../outputs/member-distribution-desktop.png', fullPage: true });
});

test('a failed distribution refresh hides stale money instead of leaving an old amount visible', async ({ page }) => {
  const state = await setup(page); await page.goto('/member');
  await expect(page.getByRole('region', { name: 'Distribution preview' })).toBeVisible();
  state.distributionFailure = true;
  await page.evaluate(() => window.dispatchEvent(new Event('visibilitychange')));
  await expect(page.getByRole('region', { name: 'Distribution preview' })).toHaveCount(0);
  await expect(page.getByText('The distribution preview could not be loaded.', { exact: false })).toBeVisible();
});

test('dashboard failures do not invent zero balances', async ({ page }) => {
  const state = await setup(page); state.summaryFailure = true;
  await page.goto('/member');
  await expect(page.getByRole('alert')).toContainText('No balances are being estimated');
  await expect(page.getByText('KES 0.00', { exact: true })).toHaveCount(0);
});

test('an approved allocation is presented as a saved allocation rather than a new forecast', async ({ page }) => {
  await setup(page);
  await page.route('**/api/member-portal/distribution', route => route.fulfill({ json: { ...distribution, status: 'APPROVED', group: { ...distribution.group, breakdown: null } } }));
  await page.goto('/member/distribution');
  await expect(page.getByText('Approved income share', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Approved allocation basis' })).toBeVisible();
  await expect(page.getByText(/These amounts are taken from the saved AGM-approved allocation/)).toBeVisible();
  await expect(page.getByText('Year-end estimate', { exact: true })).toHaveCount(0);
});

test('dashboard and distribution details use mobile space without page overflow', async ({ page }) => {
  await setup(page);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 }); await page.goto('/member');
    await expect(page.getByRole('region', { name: 'Distribution preview' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: '../outputs/member-dashboard-mobile.png', fullPage: true });
  await page.goto('/member/distribution');
  await expect(page.getByRole('heading', { name: 'Your distribution, explained' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: /Your contribution history/ }).click();
  await expect(page.getByText('MTG20260034', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '../outputs/member-distribution-mobile.png', fullPage: true });
});

test('settings visibility saves independently and reflects the confirmed server value', async ({ page }) => {
  const state = await setup(page, true); state.visible = false;
  await page.goto('/dashboard/settings');
  const toggle = page.getByRole('button', { name: 'Show member distribution estimates', exact: true });
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Visible to members', { exact: false })).toBeVisible();
  expect(state.visibilityWrites).toEqual([true]);
  state.visibilityFailure = true;
  await toggle.click();
  await expect(page.getByText('Unable to save visibility', { exact: true })).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
});

test('the visibility control remains usable when ordinary financial settings are frozen', async ({ page }) => {
  const state = await setup(page, true); state.visible = false;
  await page.route('**/api/ledger/system-settings', route => route.fulfill({ status: 404, json: { error: 'No open financial year found' } }));
  await page.goto('/dashboard/settings');
  const toggle = page.getByRole('button', { name: 'Show member distribution estimates', exact: true });
  await expect(toggle).toBeEnabled();
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
});

import { expect, test } from '@playwright/test';
import { apiGet, apiPost, loginApi, uiLogin } from './helpers/api';
import { credentials, expectedLanding, type RoleKey } from './helpers/test-data';

test.describe('auth, portals, and workspaces', () => {
  (Object.keys(credentials) as RoleKey[]).forEach((role) => {
    test(`${role} logs in and lands in the correct portal`, async ({ page }) => {
      await uiLogin(page, role);
      await expect(page).toHaveURL(new RegExp(`${expectedLanding[role]}($|/)`));
      await expect(page.locator('header').getByText(/Clin-Grow Welfare Group/i)).toBeVisible();
    });
  });

  test('dual-role official can switch between Officials and Member workspaces', async ({ page }) => {
    await uiLogin(page, 'dualRole');
    await expect(page).toHaveURL(/\/officials/);
    await page.getByRole('button', { name: /Olivia Official/i }).click();
    await page.getByRole('menuitem', { name: /Member Portal/i }).click();
    await expect(page).toHaveURL(/\/member/);
    await page.getByRole('button', { name: /Olivia Official/i }).click();
    await page.getByRole('menuitem', { name: /Officials Portal/i }).click();
    await expect(page).toHaveURL(/\/officials/);
  });

  test('member is blocked from Admin and Officials portals', async ({ page }) => {
    await uiLogin(page, 'member');
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/forbidden/);
    await page.goto('/officials');
    await expect(page).toHaveURL(/\/forbidden/);
  });

  test('auditor and nominated signatory have read-only API boundaries for finance mutations', async ({ request }) => {
    const auditor = await loginApi(request, 'auditor');
    const signatory = await loginApi(request, 'signatory');
    const treasurer = await loginApi(request, 'treasurer');
    await apiGet(request, auditor, '/reports/fund-balances');
    await apiGet(request, auditor, '/vouchers');
    await apiPost(request, auditor, '/meetings', { meetingType: 'ORDINARY', meetingDate: new Date().toISOString() }, 403);
    await apiPost(request, auditor, '/contributions', {}, 403);
    await apiPost(request, signatory, '/contributions', {}, 403);
    await apiPost(request, signatory, '/loans/00000000-0000-4000-8000-000000000001/disburse', {}, 403);
    await apiGet(request, treasurer, '/reports/fund-balances');
  });
});

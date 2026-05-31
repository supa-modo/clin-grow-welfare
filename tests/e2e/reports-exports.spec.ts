import { test } from '@playwright/test';
import { exportReport, loginApi, uiLogin } from './helpers/api';

test('reports center loads and PDF/CSV exports enforce RBAC', async ({ page, request }) => {
  const admin = await loginApi(request, 'admin');
  const treasurer = await loginApi(request, 'treasurer');
  const auditor = await loginApi(request, 'auditor');
  const member = await loginApi(request, 'member');
  const secretary = await loginApi(request, 'secretary');

  await uiLogin(page, 'admin');
  await page.goto('/dashboard/reports');
  await page.getByText(/Reports and Audit Readiness/i).waitFor();

  for (const key of ['meeting-close', 'contributions', 'fines', 'loan-applications', 'welfare-claims', 'trial-balance']) {
    await exportReport(request, admin, key, 'pdf');
    await exportReport(request, treasurer, key, 'csv');
  }
  await exportReport(request, auditor, 'audit-pack', 'pdf');
  await exportReport(request, member, 'member-statement', 'pdf');
  await exportReport(request, member, 'fund-balances', 'csv', 403);
  await exportReport(request, secretary, 'fund-balances', 'pdf');
});

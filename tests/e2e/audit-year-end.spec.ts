import { expect, test } from '@playwright/test';
import { apiGet, apiPost, exportReport, loginApi, uiLogin } from './helpers/api';

test('audit pack export and year-end close post balanced distribution journals', async ({ page, request }) => {
  const admin = await loginApi(request, 'admin');
  const auditor = await loginApi(request, 'auditor');
  const suffix = Date.now();

  await uiLogin(page, 'auditor');
  await page.goto('/officials/reports');
  await expect(page.getByText(/Reports and Audit Readiness/i)).toBeVisible();

  const years = await apiGet(request, admin, '/ledger/financial-years');
  const activeFy = (await years.json()).years.find((fy: any) => fy.status === 'OPEN');
  const query = await apiPost(request, auditor, '/audit-year-end/queries', { financialYearId: activeFy.id, queryText: `E2E audit query ${suffix}`, assignedTo: admin.user.id }, 201);
  const dueDate = new Date((await query.json()).query.dueDate).getTime();
  expect(dueDate).toBeGreaterThan(Date.now() + 29 * 86_400_000);
  await apiPost(request, admin, `/audit-year-end/queries/${(await query.json()).query.id}/responses`, { responseText: 'Management response for E2E audit query.' }, 201);
  await exportReport(request, auditor, 'audit-pack', 'pdf');
  await exportReport(request, auditor, 'audit-pack', 'csv');

  const meetings = (await (await apiGet(request, admin, '/meetings?page=1&pageSize=20')).json()).data;
  for (const meeting of meetings.filter((row: any) => !['CLOSED', 'COMPLETED', 'CANCELLED'].includes(row.status))) {
    await apiPost(request, admin, `/meetings/${meeting.id}/close`);
  }

  const fy = await apiPost(request, admin, '/ledger/financial-years', {
    name: `E2E-YE-${suffix}`,
    startDate: '2032-01-01T00:00:00.000Z',
    endDate: '2032-12-31T00:00:00.000Z',
    savingsStopDate: '2032-10-31T00:00:00.000Z',
  }, 201);
  const newFy = (await fy.json()).financialYear;
  const accounts = (await (await apiGet(request, admin, '/ledger/accounts')).json()).accounts;
  const cash = accounts.find((row: any) => row.code === '1001');
  const income = accounts.find((row: any) => row.code === '4003');
  await apiPost(request, admin, '/ledger/journals', {
    financialYearId: newFy.id,
    transactionDate: '2032-11-30T00:00:00.000Z',
    description: 'E2E year-end distributable fine income',
    lines: [
      { ledgerAccountId: cash.id, debitAmount: 100, creditAmount: 0 },
      { ledgerAccountId: income.id, debitAmount: 0, creditAmount: 100 },
    ],
  }, 201);

  const initiated = await apiPost(request, admin, `/audit-year-end/year-end/${newFy.id}/initiate`, {}, 201);
  expect((await initiated.json()).closing.status).toBe('READY_FOR_AGM');
  const approved = await apiPost(request, admin, `/audit-year-end/year-end/${(await initiated.json()).closing.id}/approve`, {});
  expect((await approved.json()).closing.status).toBe('AGM_APPROVED');
  const posted = await apiPost(request, admin, `/audit-year-end/year-end/${(await initiated.json()).closing.id}/post`, {});
  expect((await posted.json()).closing.status).toBe('POSTED');
  await exportReport(request, admin, 'year-end-distribution-journals', 'csv');
  await apiPost(request, admin, '/ledger/journals', {
    financialYearId: newFy.id,
    transactionDate: '2032-12-31T00:00:00.000Z',
    description: 'Closed year blocked posting',
    lines: [
      { ledgerAccountId: cash.id, debitAmount: 1, creditAmount: 0 },
      { ledgerAccountId: income.id, debitAmount: 0, creditAmount: 1 },
    ],
  }, 400);
});

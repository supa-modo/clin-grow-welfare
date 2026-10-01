import { expect, test } from '@playwright/test';

for (const recovery of [true, false]) {
  test(recovery ? 'recovery meeting goes from repayments through AOB to close without opening lending' : 'AOB remains available after an ordinary loan window is closed', async ({ page }) => {
    const user = { id: 'user', name: 'Test Secretary', memberId: null, roles: ['Secretary'], permissions: ['officialsPortal.meetings.view', 'officialsPortal.meetings.collections.manage', 'officialsPortal.meetings.loanWindow.manage'] };
    const meeting = {
      id: 'meeting', meetingNumber: 'MTG-RECOVERY', meetingType: 'ORDINARY', meetingDate: '2026-11-05T12:00:00Z', venue: 'Meeting room',
      status: 'COLLECTIONS_OPEN', ceremonyStep: 'repayments', attendanceFinalizedAt: '2026-11-05T12:00:00Z', collectionsFinalizedAt: '2026-11-05T12:00:00Z',
      anyOtherBusiness: '', mattersArising: '', resolutions: [], collectionItems: [], collectionSessions: [],
      loanStageReachedAt: null,
      loanWindows: recovery ? [] : [{ id: 'window', status: 'CLOSED', reservations: [] }],
    };
    const writes: string[] = [];
    await page.addInitScript(({ user }) => {
      localStorage.setItem('clingrow_token', 'isolated-test-token');
      localStorage.setItem('clingrow_user', JSON.stringify(user));
    }, { user });
    await page.route('**/api/**', async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname.replace(/^\/api/, '');
      if (request.method() !== 'GET') writes.push(path);
      let body: unknown = {};
      if (path === '/auth/me') body = { user };
      else if (path === '/meetings') body = { data: [meeting] };
      else if (path.endsWith('/roster')) body = { meeting, collectionsPaused: recovery, lendingClosed: recovery, settings: { lateFine: 100, minWeeklySavings: 250, maxWeeklySavings: 1000 }, members: [{ member: { id: 'member', name: 'Member', membershipNumber: 'CG1' }, expectations: { weeklySavings: { paidThisWeek: 0, min: 250, max: 1000, remainingToMax: 1000 }, shareCapital: { paidToDate: 500, max: 5000, remaining: 4500 }, welfareKitty: { paidThisMonth: 0, dueThisMonth: 0 }, fines: { pendingTotal: 0, rows: [] }, loans: { active: [], outstandingTotal: 0 } } }] };
      else if (path.endsWith('/loan-window/pool')) body = { pool: { totalLoanablePool: 0, remainingAmount: 0, reservedAmount: 0, lendingClosed: recovery } };
      else if (path.endsWith('/unclaimed-carryover')) body = { amount: 750 };
      else if (path.endsWith('/rollover-candidates')) body = { candidates: [] };
      else if (path.endsWith('/collections/readiness')) body = { readiness: { ready: true, collectionsPaused: recovery, rows: [] } };
      else if (path.endsWith('/ceremony-step')) { meeting.ceremonyStep = request.postDataJSON().step; body = { meeting }; }
      else if (path.endsWith('/aob')) { meeting.anyOtherBusiness = request.postDataJSON().text; body = { meeting }; }
      else if (path.endsWith('/close-readiness')) body = { readiness: { ready: true, quorumMet: true, checks: [] } };
      else if (path.endsWith('/close')) { meeting.status = 'CLOSED'; body = { meeting }; }
      else if (path === '/meetings/meeting') body = { meeting };
      else if (path.endsWith('/report')) body = { report: { summary: { meetingNumber: meeting.meetingNumber, anyOtherBusiness: meeting.anyOtherBusiness } } };
      else if (path.includes('/notifications')) body = { data: [], unreadCount: 0 };
      await route.fulfill({ json: body });
    });
    await page.goto('/officials/meetings');
    await expect(page.getByRole('heading', { name: 'Meeting Control Room' })).toBeVisible();
    await page.getByRole('button', { name: 'Next: summary', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Any other business (AOB)' })).toBeVisible();
    await page.getByLabel('Any other business', { exact: true }).fill('Recovery collections discussed.');
    await page.getByRole('button', { name: 'Save AOB', exact: true }).click();
    await expect.poll(() => meeting.anyOtherBusiness).toBe('Recovery collections discussed.');
    if (recovery) {
      await expect(page.getByRole('button', { name: 'Loan window', exact: true })).toHaveCount(0);
      await expect(page.getByText('Open the loan window to claim it.')).toHaveCount(0);
      await page.getByRole('button', { name: 'Next: close', exact: true }).click();
      await page.getByRole('button', { name: 'Close meeting', exact: true }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Close meeting', exact: true }).click();
      await expect.poll(() => meeting.status).toBe('CLOSED');
    }
    expect(writes.some(path => path.includes('/loan-window'))).toBe(false);
  });
}

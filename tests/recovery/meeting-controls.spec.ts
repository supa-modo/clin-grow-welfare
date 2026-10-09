import { test, expect } from '@playwright/test';

async function setup(page: any, started: boolean, overrides: Record<string, unknown> = {}) {
  const user = { id: 'admin', name: 'Secretary', roles: ['Secretary'], permissions: ['officialsPortal.meetings.view', 'officialsPortal.meetings.create', 'officialsPortal.meetings.collections.manage', 'officialsPortal.meetings.recordAttendance'] };
  const meeting: any = { id: 'm1', meetingNumber: 'MTG-TEST', meetingType: 'ORDINARY', meetingDate: '2026-11-05T12:00:00Z', venue: 'Old hall', virtualLink: '', agenda: 'Original agenda', status: started ? 'COLLECTIONS_OPEN' : 'NOTICE_SENT', ceremonyStep: started ? 'repayments' : null, attendanceFinalizedAt: started ? '2026-11-05T12:00:00Z' : null, collectionsFinalizedAt: started ? '2026-11-05T12:00:00Z' : null, collectionItems: [], collectionSessions: [], loanWindows: [], resolutions: [] };
  Object.assign(meeting, overrides);
  const candidate = { loanId: 'loan1', loanNumber: 'LN-TEST', memberId: 'member1', memberName: 'Member One', membershipNumber: 'CG1', applicationDate: '2026-08-12', disbursedAt: '2026-08-13', periodNumber: 4, dueDate: meeting.meetingDate, proposedAmount: 3000, interestAmount: 1000, penaltyAmount: 2000, interestRate: 10, penaltyRate: 20, outstandingBalance: 10000, rolloverCount: 2, chargeKind: 'LATE_CHARGE', status: 'PENDING' };
  let pending = started;
  const writes: Array<{ path: string; body: any }> = [];
  await page.addInitScript((user: any) => { localStorage.setItem('clingrow_token', 'isolated'); localStorage.setItem('clingrow_user', JSON.stringify(user)); }, user);
  await page.route('**/api/**', async (route: any) => {
    const request = route.request(), path = new URL(request.url()).pathname.replace(/^\/api/, '');
    if (request.method() !== 'GET') writes.push({ path, body: request.postDataJSON() });
    let body: any = { data: [], unreadCount: 0 };
    if (path === '/auth/me') body = { user };
    else if (path === '/meetings') body = { data: [meeting] };
    else if (path.endsWith('/roster')) body = { meeting, collectionsPaused: true, lendingClosed: true, settings: { lateFine: 100, minWeeklySavings: 250, maxWeeklySavings: 1000 }, members: [{ member: { id: 'member1', name: 'Member One', membershipNumber: 'CG1' }, expectations: { weeklySavings: { paidThisWeek: 0, min: 250, max: 1000, remainingToMax: 1000 }, shareCapital: { paidToDate: 500, max: 5000, remaining: 4500 }, welfareKitty: { paidThisMonth: 0, dueThisMonth: 0 }, fines: { pendingTotal: 0, rows: [] }, loans: { active: started ? [{ id: 'loan1', loanNumber: 'LN-TEST', totalOutstanding: 10000, status: 'OVERDUE', applicationDate: '2026-08-12', disbursedAt: '2026-08-13', nextInterestDate: meeting.meetingDate }] : [], outstandingTotal: started ? 10000 : 0 } } }] };
    else if (path.endsWith('/loan-window/pool')) body = { pool: { totalLoanablePool: 0, remainingAmount: 0, reservedAmount: 0, lendingClosed: true } };
    else if (path.endsWith('/unclaimed-carryover')) body = { amount: 0 };
    else if (path.endsWith('/rollover-candidates')) body = { candidates: pending ? [candidate] : [] };
    else if (path.endsWith('/collections/readiness')) body = { readiness: { ready: true, collectionsPaused: true, rows: [] } };
    else if (path.endsWith('/reschedule')) { Object.assign(meeting, request.postDataJSON()); body = { meeting, reminderQueued: true }; }
    else if (path.endsWith('/rollover/waive')) { pending = false; body = { rollover: {} }; }
    else if (path === '/meetings/m1') body = { meeting };
    else if (path.endsWith('/report')) body = { report: { summary: {} } };
    await route.fulfill({ json: body });
  });
  await page.goto('/officials/meetings/m1');
  await expect(page.getByText('Meeting Control room', { exact: true })).toBeVisible();
  return { writes, meeting };
}

test('unstarted meeting reschedules in Nairobi time with retained or editable agenda', async ({ page }) => {
  const { writes, meeting } = await setup(page, false);
  await page.getByRole('button', { name: 'Actions for MTG-TEST' }).click();
  await page.getByText('Reschedule Meeting', { exact: true }).click();
  const modal = page.getByRole('dialog');
  await expect(modal.getByRole('textbox', { name: 'Agenda', exact: true })).toHaveText('Original agenda');
  await expect(modal.getByLabel('New date and time (Nairobi)')).toHaveValue('2026-11-05T15:00');
  await modal.getByLabel('New date and time (Nairobi)').fill('2026-11-06T17:45');
  await modal.getByLabel('Venue', { exact: true }).fill('New hall');
  await modal.getByLabel('Reason for postponement').fill('Members agreed to postpone');
  await modal.getByRole('button', { name: 'Reschedule and notify' }).click();
  await expect.poll(() => writes.find(w => w.path.endsWith('/reschedule'))?.body).toMatchObject({ meetingDate: '2026-11-06T14:45:00.000Z', venue: 'New hall', agenda: 'Original agenda', reason: 'Members agreed to postpone' });
  await expect(modal).toHaveCount(0);
  expect(meeting.id).toBe('m1');
  await page.getByRole('button', { name: 'Actions for MTG-TEST' }).click();
  await page.getByText('Reschedule Meeting', { exact: true }).click();
  await modal.getByRole('textbox', { name: 'Agenda', exact: true }).fill('Revised agenda');
  await modal.getByLabel('Reason for postponement').fill('Agenda updated by members');
  await modal.getByRole('button', { name: 'Reschedule and notify' }).click();
  await expect.poll(() => writes.filter(w => w.path.endsWith('/reschedule')).at(-1)?.body.agenda).toBe('<p>Revised agenda</p>');
});

for (const component of ['INTEREST', 'PENALTY', 'BOTH']) {
  test(`period-four waiver ${component} selects only agreed components`, async ({ page }) => {
    const { writes } = await setup(page, true);
    await expect(page.getByRole('button', { name: 'Reschedule', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Override actions for Member One' }).click();
    await page.getByText('Waive interest / penalty', { exact: true }).click();
    const modal = page.getByRole('dialog');
    await expect(modal.getByRole('button', { name: 'Record waiver' })).toBeDisabled();
    await expect(modal.getByText('Charge remaining: KES 3,000')).toBeVisible();
    if (component !== 'PENALTY') await modal.getByRole('checkbox', { name: /Waive 10% interest/ }).check();
    if (component !== 'INTEREST') await modal.getByRole('checkbox', { name: /Waive 20% penalty/ }).check();
    await expect(modal.getByText('Charge remaining: KES ' + (component === 'INTEREST' ? '2,000' : component === 'PENALTY' ? '1,000' : '0'))).toBeVisible();
    await modal.getByRole('textbox', { name: 'Waiver reason (required)' }).fill('Members agreed');
    await modal.getByRole('button', { name: 'Record waiver' }).click();
    await expect.poll(() => writes.find(w => w.path.endsWith('/rollover/waive'))?.body).toEqual({ periodNumber: 4, reason: 'Members agreed', component });
  });
}


for (const state of ['editable', 'finalized', 'correction'] as const) {
  test(`attendance actions remain visible and honor ${state} safeguards`, async ({ page }) => {
    const { writes } = await setup(page, true, { status: 'ATTENDANCE_RECORDING', ceremonyStep: 'attendance', attendanceFinalizedAt: state === 'editable' ? null : '2026-11-05T12:00:00Z', collectionsFinalizedAt: null, correctionModeAt: state === 'correction' ? '2026-11-05T12:00:00Z' : null });
    await page.setViewportSize({ width: 550, height: 844 });
    const row = page.locator('tbody tr').first();
    const action = row.getByRole('button', { name: state === 'finalized' ? 'Locked' : 'Save', exact: true });
    await expect(action).toBeVisible();
    await expect(row.locator('td').last()).toHaveCSS('position', 'sticky');
    const bounds = await action.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(550);
    if (state === 'finalized') {
      await expect(action).toBeDisabled();
      await expect(page.getByRole('combobox', { name: 'Attendance status for Member One' })).toBeDisabled();
    } else {
      await expect(action).toBeEnabled();
      await action.click();
      await expect.poll(() => writes.some(w => w.path.endsWith('/attendance'))).toBe(true);
    }
  });
}

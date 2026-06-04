import { expect, test } from '@playwright/test';
import { apiGet, apiPost, createMeeting, createReadyVoucher, exportReport, getMemberByNo, getMembers, loginApi, uiLogin } from './helpers/api';

test('full weekly meeting ceremony with attendance, collections, loan window, voucher, and close report', async ({ page, request }) => {
  const secretary = await loginApi(request, 'secretary');
  const treasurer = await loginApi(request, 'treasurer');
  const chair = await loginApi(request, 'chairperson');
  const member = await loginApi(request, 'member');
  const eligible = await loginApi(request, 'eligibleMember');

  await uiLogin(page, 'secretary');
  await page.goto('/officials/meetings');
  await expect(page.getByText(/Meeting Control Room/i)).toBeVisible();

  const present = await getMemberByNo(request, secretary, 'CG20260001');
  const late = await getMemberByNo(request, secretary, 'CG20260003');
  const absentNoApology = await getMemberByNo(request, secretary, 'CG20260004');
  const eligibleMember = await getMemberByNo(request, secretary, 'CG20260004');

  const meeting = await createMeeting(request, secretary, 'weekly ceremony');
  await apiPost(request, secretary, `/meetings/${meeting.id}/notices`, { channel: 'IN_APP' });
  const apology = await apiPost(request, member, `/member-portal/meetings/${meeting.id}/apologies`, { reason: 'Client field visit' }, 201);
  await apiPost(request, secretary, `/meetings/${meeting.id}/start`);
  await apiPost(request, secretary, `/meetings/apologies/${(await apology.json()).apology.id}/review`, { decision: 'ACCEPTED', comment: 'Accepted for test' });
  await apiPost(request, secretary, `/meetings/${meeting.id}/attendance`, { memberId: present.id, attendanceStatus: 'PRESENT_ON_TIME' });
  await apiPost(request, secretary, `/meetings/${meeting.id}/attendance`, { memberId: late.id, attendanceStatus: 'PRESENT_LATE' });
  await apiPost(request, secretary, `/meetings/${meeting.id}/attendance`, { memberId: absentNoApology.id, attendanceStatus: 'ABSENT_WITHOUT_APOLOGY' });
  const explicitlyMarked = new Set([present.id, late.id, absentNoApology.id]);
  for (const row of await getMembers(request, secretary)) {
    if (row.status === 'ACTIVE' && !explicitlyMarked.has(row.id)) {
      await apiPost(request, secretary, `/meetings/${meeting.id}/attendance`, { memberId: row.id, attendanceStatus: 'PRESENT_ON_TIME' });
    }
  }

  const fines = await apiGet(request, secretary, '/reports/fines-generated/export?format=csv');
  expect(await fines.text()).toContain('PRESENT_LATE');

  const session = (await (await apiPost(request, treasurer, `/meetings/${meeting.id}/collections/open`, {}, 201)).json()).session;
  await apiPost(request, treasurer, `/meetings/${meeting.id}/collections/${session.id}/items`, { memberId: present.id, collectionType: 'WEEKLY_SAVINGS', amount: 250, paymentMethod: 'MPESA', paymentReference: `E2E-SAVE-${Date.now()}` }, 201);
  await apiPost(request, treasurer, `/meetings/${meeting.id}/collections/${session.id}/items`, { memberId: eligibleMember.id, collectionType: 'WEEKLY_SAVINGS', amount: 1000, paymentMethod: 'MPESA', paymentReference: `E2E-ELIGIBLE-SAVE-${Date.now()}` }, 201);
  await apiPost(request, treasurer, `/meetings/${meeting.id}/collections/${session.id}/items`, { memberId: present.id, collectionType: 'WELFARE_KITTY', amount: 250, paymentMethod: 'MPESA', paymentReference: `E2E-KITTY-${Date.now()}` }, 201);

  const poolBefore = (await (await apiGet(request, treasurer, `/meetings/${meeting.id}/loan-window/pool`)).json()).pool;
  expect(poolBefore.excludedFunds).toContain('WELFARE_KITTY');
  const loanWindow = (await (await apiPost(request, treasurer, `/meetings/${meeting.id}/loan-window/open`, {}, 201)).json()).loanWindow;
  const reservation = await apiPost(request, eligible, `/meetings/loan-window/${loanWindow.id}/reservations`, { memberId: eligibleMember.id, requestedAmount: 1000, purpose: 'E2E meeting loan' }, 201);
  const { loan } = await reservation.json();
  const poolAfter = (await (await apiGet(request, treasurer, `/meetings/${meeting.id}/loan-window/pool`)).json()).pool;
  expect(Number(poolAfter.reservedAmount)).toBeGreaterThanOrEqual(1000);
  await apiPost(request, eligible, `/meetings/loan-window/${loanWindow.id}/reservations`, { memberId: eligibleMember.id, requestedAmount: 99999999, purpose: 'Over pool' }, 400);

  await apiPost(request, treasurer, `/loans/${loan.id}/verify`);
  await apiPost(request, chair, `/loans/${loan.id}/approve`, { approvedAmount: 1000 });
  await apiPost(request, chair, `/loans/${loan.id}/generate-agreement`);
  await apiPost(request, eligible, `/member-portal/loans/${loan.id}/acknowledge-agreement`);
  await apiPost(request, treasurer, `/loans/${loan.id}/verify-agreement`);
  await apiPost(request, chair, `/loans/${loan.id}/authorize-agreement`);
  await createReadyVoucher(request, treasurer, chair, { entityType: 'Loan', entityId: loan.id, memberId: eligibleMember.id, amount: 1000, description: 'E2E loan disbursement voucher' });
  const disbursed = await apiPost(request, treasurer, `/loans/${loan.id}/disburse`);
  expect((await disbursed.json()).loan.status).toBe('ACTIVE');
  await apiPost(request, treasurer, `/loans/${loan.id}/disburse`, {}, 400);
  await apiPost(request, treasurer, `/meetings/loan-window/${loanWindow.id}/close`);

  await apiPost(request, secretary, `/meetings/${meeting.id}/minutes`, { minutes: 'E2E meeting minutes recorded and approved.' });
  await apiPost(request, secretary, `/meetings/${meeting.id}/resolutions`, { title: 'E2E loan resolution', decision: 'APPROVED', linkedEntityType: 'Loan', linkedEntityId: loan.id, votesFor: 5, votesAgainst: 0 }, 201);
  const closed = await apiPost(request, secretary, `/meetings/${meeting.id}/close`);
  expect((await closed.json()).meeting.status).toBe('CLOSED');
  await apiPost(request, secretary, `/meetings/${meeting.id}/attendance`, { memberId: present.id, attendanceStatus: 'PRESENT_ON_TIME' }, 400);
  await exportReport(request, treasurer, 'meeting-close', 'pdf');
  await exportReport(request, treasurer, 'meeting-collections', 'csv');
});

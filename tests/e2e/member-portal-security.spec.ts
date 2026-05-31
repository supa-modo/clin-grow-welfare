import { expect, test } from '@playwright/test';
import { apiGet, apiPost, createMeeting, getMemberByNo, loginApi, uiLogin } from './helpers/api';

test('member portal is scoped and URL/API tampering is blocked', async ({ page, request }) => {
  const secretary = await loginApi(request, 'secretary');
  const member = await loginApi(request, 'member');
  const other = await loginApi(request, 'eligibleMember');
  const ownProfile = await apiGet(request, member, '/member-portal/profile');
  const otherMember = await getMemberByNo(request, secretary, 'CG20260004');
  expect((await ownProfile.json()).member.id).not.toBe(otherMember.id);

  await uiLogin(page, 'member');
  for (const route of ['/member', '/member/profile', '/member/contributions', '/member/meetings', '/member/welfare', '/member/loans']) {
    await page.goto(route);
    await expect(page).not.toHaveURL(/\/forbidden/);
  }

  const otherLoans = await apiGet(request, other, '/member-portal/loans');
  const loan = (await otherLoans.json()).loans[0];
  if (loan) await apiGet(request, member, `/member-portal/loans/${loan.id}`, 404);

  await apiPost(request, member, '/member-portal/loans', { requestedAmount: 500, purpose: 'Closed window direct apply check' }, 400);
  const meeting = await createMeeting(request, secretary, 'member loan window');
  await apiPost(request, secretary, `/meetings/${meeting.id}/start`);
  const treasurer = await loginApi(request, 'treasurer');
  const window = (await (await apiPost(request, treasurer, `/meetings/${meeting.id}/loan-window/open`, {}, 201)).json()).loanWindow;
  await apiPost(request, member, `/meetings/loan-window/${window.id}/reservations`, { memberId: otherMember.id, requestedAmount: 100, purpose: 'Tamper member id' }, 403);
});

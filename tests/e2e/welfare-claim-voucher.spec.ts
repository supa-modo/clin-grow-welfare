import { expect, test } from '@playwright/test';
import { apiGet, apiPost, createReadyVoucher, exportReport, getMemberByNo, loginApi, uiLogin } from './helpers/api';

test('welfare claim is paid only through welfare voucher/signatory controls', async ({ page, request }) => {
  const member = await loginApi(request, 'member');
  const secretary = await loginApi(request, 'secretary');
  const chair = await loginApi(request, 'chairperson');
  const treasurer = await loginApi(request, 'treasurer');
  const auditor = await loginApi(request, 'auditor');
  const signatory = await loginApi(request, 'signatory');
  const owner = await getMemberByNo(request, secretary, 'CG20260001');

  await uiLogin(page, 'member');
  await page.goto('/member/welfare');
  await expect(page.getByText(/Welfare Claims/i)).toBeVisible();

  const types = await apiGet(request, member, '/welfare/types');
  const claimType = (await types.json()).types.find((type: any) => type.name === 'Hospitalization');
  const claim = await apiPost(request, member, '/welfare', { memberId: owner.id, claimTypeId: claimType.id, amountRequested: 100, reason: 'E2E hospitalization claim' }, 201);
  const claimId = (await claim.json()).claim.id;
  await apiPost(request, member, '/welfare', { memberId: owner.id, claimTypeId: claimType.id, amountRequested: 999999, reason: 'Above cap' }, 400);

  await apiPost(request, auditor, `/welfare/${claimId}/approve`, { amountApproved: 100 }, 403);
  await apiPost(request, chair, `/welfare/${claimId}/approve`, { amountApproved: 100 });
  await apiPost(request, treasurer, `/welfare/${claimId}/pay`, {}, 400);

  const voucher = await createReadyVoucher(request, treasurer, chair, { entityType: 'WelfareClaim', entityId: claimId, memberId: owner.id, amount: 100, description: 'E2E welfare claim voucher' });
  expect(voucher.status).toBe('PAYMENT_READY');
  await apiPost(request, signatory, `/welfare/${claimId}/pay`, {}, 403);
  const paid = await apiPost(request, treasurer, `/welfare/${claimId}/pay`);
  expect((await paid.json()).claim.status).toBe('PAID');

  const claims = await apiGet(request, member, '/welfare/member/me');
  expect(JSON.stringify(await claims.json())).toContain('PAID');
  await exportReport(request, treasurer, 'welfare-claims', 'pdf');
  await exportReport(request, auditor, 'welfare-claim-payments', 'csv');
});

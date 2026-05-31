import { test } from '@playwright/test';
import { apiGet, apiPost, getMemberByNo, loginApi } from './helpers/api';

test('critical RBAC negative matrix blocks unsafe role actions', async ({ request }) => {
  const admin = await loginApi(request, 'admin');
  const member = await loginApi(request, 'member');
  const auditor = await loginApi(request, 'auditor');
  const signatory = await loginApi(request, 'signatory');
  const secretary = await loginApi(request, 'secretary');
  const treasurer = await loginApi(request, 'treasurer');
  const chair = await loginApi(request, 'chairperson');
  const own = await getMemberByNo(request, admin, 'CG20260001');

  await apiGet(request, member, '/members?page=1&pageSize=1', 403);
  await apiGet(request, member, '/reports/fund-balances', 403);
  await apiPost(request, auditor, '/meetings', { meetingType: 'ORDINARY', meetingDate: new Date().toISOString() }, 403);
  await apiPost(request, auditor, '/contributions', { memberId: own.id, contributionType: 'WEEKLY_SAVINGS', amount: 250, periodDate: new Date().toISOString(), paymentMethod: 'MPESA' }, 403);
  await apiPost(request, auditor, '/welfare/00000000-0000-4000-8000-000000000001/pay', {}, 403);
  await apiPost(request, auditor, '/vouchers/00000000-0000-4000-8000-000000000001/sign', {}, 403);
  await apiPost(request, signatory, '/contributions', { memberId: own.id, contributionType: 'WEEKLY_SAVINGS', amount: 250, periodDate: new Date().toISOString(), paymentMethod: 'MPESA' }, 403);
  await apiPost(request, signatory, '/loans/00000000-0000-4000-8000-000000000001/repay', { amount: 1, paymentMethod: 'MPESA' }, 403);
  await apiPost(request, secretary, '/contributions', { memberId: own.id, contributionType: 'WEEKLY_SAVINGS', amount: 250, periodDate: new Date().toISOString(), paymentMethod: 'MPESA' }, 403);
  await apiPost(request, secretary, '/loans/00000000-0000-4000-8000-000000000001/disburse', {}, 403);
  await apiPost(request, treasurer, '/vouchers/00000000-0000-4000-8000-000000000001/approve', {}, 403);
  await apiPost(request, chair, '/contributions', { memberId: own.id, contributionType: 'WEEKLY_SAVINGS', amount: 250, periodDate: new Date().toISOString(), paymentMethod: 'MPESA' }, 403);
  await apiGet(request, admin, '/audit-year-end/queries');
});

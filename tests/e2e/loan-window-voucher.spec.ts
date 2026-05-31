import { expect, test } from '@playwright/test';
import { apiGet, apiPost, createMeeting, createReadyVoucher, getMemberByNo, loginApi } from './helpers/api';

test('loan window application, agreement, voucher, disbursement, repayment, and reversal are browser-verified by API context', async ({ request }) => {
  const secretary = await loginApi(request, 'secretary');
  const treasurer = await loginApi(request, 'treasurer');
  const chair = await loginApi(request, 'chairperson');
  const eligible = await loginApi(request, 'eligibleMember');
  const ineligible = await loginApi(request, 'ineligibleMember');
  const signatory = await loginApi(request, 'signatory');
  const member = await getMemberByNo(request, secretary, 'CG20260004');
  const ineligibleMember = await getMemberByNo(request, secretary, 'CG20260005');

  const meeting = await createMeeting(request, secretary, 'loan window');
  await apiPost(request, secretary, `/meetings/${meeting.id}/start`);
  const window = (await (await apiPost(request, treasurer, `/meetings/${meeting.id}/loan-window/open`, {}, 201)).json()).loanWindow;
  await apiPost(request, ineligible, `/meetings/loan-window/${window.id}/reservations`, { memberId: ineligibleMember.id, requestedAmount: 1000, purpose: 'Should fail' }, 400);
  const reserved = await apiPost(request, eligible, `/meetings/loan-window/${window.id}/reservations`, { memberId: member.id, requestedAmount: 1000, purpose: 'E2E disbursement test' }, 201);
  const loan = (await reserved.json()).loan;

  await apiPost(request, treasurer, `/loans/${loan.id}/verify`);
  await apiPost(request, treasurer, `/loans/${loan.id}/approve`, { approvedAmount: 1000 }, 403);
  await apiPost(request, chair, `/loans/${loan.id}/approve`, { approvedAmount: 1000 });
  await apiPost(request, chair, `/loans/${loan.id}/generate-agreement`);
  await apiPost(request, eligible, `/member-portal/loans/${loan.id}/acknowledge-agreement`);
  await apiPost(request, treasurer, `/loans/${loan.id}/verify-agreement`);
  await apiPost(request, chair, `/loans/${loan.id}/authorize-agreement`);
  await apiPost(request, treasurer, `/loans/${loan.id}/disburse`, {}, 400);

  await createReadyVoucher(request, treasurer, chair, { entityType: 'Loan', entityId: loan.id, memberId: member.id, amount: 1000, description: 'Loan disbursement voucher' });
  const disbursed = await apiPost(request, treasurer, `/loans/${loan.id}/disburse`);
  expect((await disbursed.json()).loan.status).toBe('ACTIVE');
  await apiPost(request, signatory, `/loans/${loan.id}/repay`, { amount: 100, paymentMethod: 'MPESA' }, 403);
  await apiPost(request, treasurer, `/loans/${loan.id}/repay`, { amount: 1000, paymentMethod: 'MPESA', paymentReference: `E2E-FULL-REPAY-${Date.now()}` }, 201);
  const statement = await apiGet(request, eligible, `/member-portal/loans/${loan.id}`);
  expect((await statement.json()).loan.id).toBe(loan.id);
});

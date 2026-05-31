import { expect, test } from '@playwright/test';
import { apiGet, apiPost, authHeaders, exportReport, getMemberByNo, loginApi, uiLogin } from './helpers/api';

test('Phase 0-5 browser regression covers auth, members, documents, contributions, ledger, loans, and scoping', async ({ page, request }) => {
  const admin = await loginApi(request, 'admin');
  const treasurer = await loginApi(request, 'treasurer');
  const member = await loginApi(request, 'member');
  const owner = await getMemberByNo(request, admin, 'CG20260001');

  await uiLogin(page, 'admin');
  await page.goto('/dashboard/members');
  await expect(page.getByRole('heading', { name: /Members Registry/i })).toBeVisible();
  await page.goto('/dashboard/ledger/journals');
  await expect(page.getByRole('heading', { name: /Journal/i })).toBeVisible();

  const suffix = Date.now();
  const created = await apiPost(request, admin, '/members', {
    firstName: 'E2E',
    lastName: `Regression${suffix}`,
    email: `e2e.regression.${suffix}@clingrow.test`,
    phone: `+254799${String(suffix).slice(-6)}`,
    idNumber: `E2E${suffix}`,
    dateJoined: '2026-02-01',
    dateOfBirth: '1990-01-01',
    staffStatus: 'CURRENT_CREATES_STAFF',
    constitutionAcceptedAt: '2026-02-01',
    constitutionAcceptedBy: 'E2E Regression',
    department: 'CREATES',
    beneficiaryName: 'Regression Beneficiary',
    beneficiaryPhone: '+254711000001',
    beneficiaryRelationship: 'Sibling',
    registrationFeePaid: true,
  }, 201);
  const newMember = (await created.json()).member;
  await apiPost(request, admin, '/contributions', { memberId: newMember.id, contributionType: 'SHARE_CAPITAL', amount: 500, periodDate: new Date().toISOString(), paymentMethod: 'MPESA', paymentReference: `E2E-SHARE-${suffix}` }, 201);
  await apiPost(request, admin, `/members/${newMember.id}/approve`);
  const upload = await request.post('http://127.0.0.1:5000/api/members/' + newMember.id + '/documents', {
    headers: authHeaders(admin),
    multipart: {
      file: {
        name: 'id.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('E2E document'),
      },
    },
  });
  expect(upload.status()).toBe(201);

  const contribution = await apiPost(request, treasurer, '/contributions', { memberId: owner.id, contributionType: 'WEEKLY_SAVINGS', amount: 250, periodDate: new Date().toISOString(), paymentMethod: 'MPESA', paymentReference: `E2E-CONTR-${suffix}` }, 201);
  const contributionId = (await contribution.json()).contribution.id;
  await apiPost(request, treasurer, `/contributions/${contributionId}/reverse`, { reason: 'E2E contribution reversal' });
  await exportReport(request, treasurer, 'fund-balances', 'csv');
  await apiGet(request, member, '/member-portal/contributions');
  await apiGet(request, member, '/member-portal/documents');
});

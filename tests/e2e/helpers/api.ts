import { expect, type APIRequestContext, type Page } from '@playwright/test';
import { credentials, type RoleKey } from './test-data';

export type Session = { token: string; user: any };

const apiBase = process.env.E2E_API_URL ?? 'http://127.0.0.1:5000/api';

export async function loginApi(request: APIRequestContext, role: RoleKey): Promise<Session> {
  const res = await request.post(`${apiBase}/auth/login`, {
    data: { identifier: credentials[role].email, password: credentials[role].password },
  });
  expect(res.status(), `login ${role}`).toBe(200);
  return res.json();
}

export async function uiLogin(page: Page, role: RoleKey) {
  await page.goto('/login');
  await page.getByTestId('login-identifier').fill(credentials[role].email);
  await page.getByTestId('login-password').fill(credentials[role].password);
  await page.getByTestId('login-submit').click();
  await expect(page).not.toHaveURL(/\/login$/);
}

export function authHeaders(session: Session) {
  return { Authorization: `Bearer ${session.token}` };
}

export async function apiGet(request: APIRequestContext, session: Session, path: string, status = 200) {
  const res = await request.get(`${apiBase}${path}`, { headers: authHeaders(session) });
  expect(res.status(), `GET ${path}`).toBe(status);
  return res;
}

export async function apiPost(request: APIRequestContext, session: Session, path: string, data?: unknown, status = 200) {
  const res = await request.post(`${apiBase}${path}`, { headers: authHeaders(session), data });
  expect(res.status(), `POST ${path}`).toBe(status);
  return res;
}

export async function getMembers(request: APIRequestContext, session: Session) {
  const res = await apiGet(request, session, '/members?page=1&pageSize=100');
  return (await res.json()).data as any[];
}

export async function getMemberByNo(request: APIRequestContext, session: Session, membershipNumber: string) {
  const members = await getMembers(request, session);
  const member = members.find((row) => row.membershipNumber === membershipNumber);
  expect(member, `member ${membershipNumber}`).toBeTruthy();
  return member;
}

export async function createMeeting(request: APIRequestContext, secretary: Session, label: string) {
  const res = await apiPost(request, secretary, '/meetings', {
    meetingType: 'ORDINARY',
    meetingDate: new Date(Date.now() + 86_400_000).toISOString(),
    venue: 'CREATES Meeting Room',
    agenda: `E2E ${label}: attendance, collections, loan window, vouchers, reports`,
  }, 201);
  return (await res.json()).meeting;
}

export async function exportReport(request: APIRequestContext, session: Session, reportKey: string, format: 'pdf' | 'csv', expected = 200) {
  const res = await request.get(`${apiBase}/reports/${reportKey}/export?format=${format}`, { headers: authHeaders(session) });
  expect(res.status(), `${reportKey} ${format}`).toBe(expected);
  if (expected === 200) {
    const headers = res.headers();
    expect(headers['content-type']).toContain(format === 'pdf' ? 'application/pdf' : 'text/csv');
    expect((await res.body()).length).toBeGreaterThan(20);
  }
  return res;
}

export async function createReadyVoucher(request: APIRequestContext, treasurer: Session, chair: Session, input: { entityType: string; entityId: string; memberId?: string; amount: number; description: string }) {
  const created = await apiPost(request, treasurer, '/vouchers', input, 201);
  const voucher = (await created.json()).voucher;
  await apiPost(request, treasurer, `/vouchers/${voucher.id}/documents`, { documentType: 'SUPPORT', fileName: `${input.entityType}-${Date.now()}.pdf`, mimeType: 'application/pdf', fileSize: 1024 }, 201);
  await apiPost(request, treasurer, `/vouchers/${voucher.id}/submit`);
  await apiPost(request, chair, `/vouchers/${voucher.id}/approve`);
  await apiPost(request, chair, `/vouchers/${voucher.id}/sign`);
  const ready = await apiPost(request, treasurer, `/vouchers/${voucher.id}/sign`);
  expect((await ready.json()).voucher.status).toBe('PAYMENT_READY');
  return (await ready.json()).voucher;
}

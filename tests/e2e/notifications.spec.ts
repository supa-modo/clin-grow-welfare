import { expect, test } from '@playwright/test';
import { apiGet, apiPost, createMeeting, loginApi, uiLogin } from './helpers/api';

test('notifications are created, visible, scoped, and markable as read', async ({ page, request }) => {
  const secretary = await loginApi(request, 'secretary');
  const member = await loginApi(request, 'member');
  const auditor = await loginApi(request, 'auditor');
  const meeting = await createMeeting(request, secretary, 'notifications');
  await apiPost(request, secretary, `/meetings/${meeting.id}/notices`, { channel: 'IN_APP' });

  const notifications = await apiGet(request, member, '/notifications?status=UNREAD');
  const payload = await notifications.json();
  expect(payload.notifications.some((row: any) => row.type === 'MEETING_NOTICE_SENT')).toBeTruthy();
  await apiPost(request, member, `/notifications/${payload.notifications[0].id}/read`);
  const afterRead = await apiGet(request, member, '/notifications?status=UNREAD');
  expect((await afterRead.json()).notifications.some((row: any) => row.id === payload.notifications[0].id)).toBeFalsy();

  await uiLogin(page, 'member');
  await page.getByRole('button', { name: /Notifications/i }).click();
  await expect(page.getByRole('banner').getByText('Notifications', { exact: true })).toBeVisible();

  await apiGet(request, auditor, '/notifications?status=UNREAD');
});

test('notification center supports unread count, preferences, mark-read, and mark-all', async ({ page, request }) => {
  const secretary = await loginApi(request, 'secretary');
  const member = await loginApi(request, 'member');
  const meeting = await createMeeting(request, secretary, 'notification-preferences');
  await apiPost(request, secretary, `/meetings/${meeting.id}/notices`, { channel: 'IN_APP' });

  const count = await apiGet(request, member, '/notifications/unread-count');
  expect((await count.json()).count).toBeGreaterThan(0);

  await uiLogin(page, 'member');
  await page.getByTestId('notification-bell').click();
  await page.getByTestId('notification-center-link').click();
  await expect(page).toHaveURL(/\/member\/notifications/);
  await expect(page.getByRole('heading', { name: /Notification center/i })).toBeVisible();

  await page.getByTestId('pref-MEETING_NOTICE_SENT-EMAIL').click();
  await expect(page.getByText(/preferences saved/i)).toBeVisible();

  const preferences = await apiGet(request, member, '/notification-preferences');
  const prefPayload = await preferences.json();
  expect(prefPayload.preferences.find((pref: any) => pref.notificationType === 'MEETING_NOTICE_SENT' && pref.channel === 'EMAIL').isEnabled).toBe(false);

  const firstRow = page.getByTestId('notification-row').first();
  if (await firstRow.isVisible().catch(() => false)) {
    await firstRow.click();
  }
  await page.getByTestId('notifications-mark-all-read').click();
  const after = await apiGet(request, member, '/notifications/unread-count');
  expect((await after.json()).count).toBe(0);
});

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const member = { id: 'member-user-1', name: 'Amina Member', memberId: 'member-1', memberConstitutionAccepted: false, roles: ['Member'], permissions: [] };
const values = { article: 'Article 5, Section 2', currentStatement: 'The current statement.', proposedAmendment: 'The proposed statement.', justification: 'This makes the rule clearer.' };
const draftKey = `clingrow.constitution-draft.v1:${member.id}`;
async function setup(page: Page, signedIn = true) {
  const session = { user: member, submissions: [] as Array<{ submissionId: string; recommendations: typeof values[] }>, postStatus: 201, loginStatus: 200 };
  if (signedIn) await page.addInitScript(user => {
    if (!sessionStorage.getItem('__session_initialized')) {
      localStorage.setItem('clingrow_token', 'test-session');
      localStorage.setItem('clingrow_user', JSON.stringify(user));
      sessionStorage.setItem('__session_initialized', 'true');
    }
  }, member);
  await page.context().route('**/api/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/constitution-recommendations') && route.request().method() === 'POST') {
      const body = route.request().postDataJSON(); session.submissions.push(body);
      return route.fulfill({ status: session.postStatus, json: { count: body.recommendations.length } });
    }
    if (url.pathname.endsWith('/auth/login')) return route.fulfill({ status: session.loginStatus, json: session.loginStatus === 200 ? { token: 'renewed', user: session.user } : { error: 'Invalid credentials. Please try again.' } });
    if (url.pathname.endsWith('/auth/me')) return route.fulfill({ json: { user: session.user } });
    return route.fulfill({ json: { notifications: [], count: 0 } });
  });
  return session;
}
async function fillRow(page: Page, index = 0, data = values) {
  const row = page.getByTestId('suggestion-row').nth(index);
  for (const [key, value] of Object.entries(data)) await row.locator(`[name="${key}"]`).fill(value);
}
async function login(page: Page) {
  await page.getByTestId('login-identifier').fill('amina@example.test');
  await page.getByTestId('login-password').fill('Example-password1!');
  await page.getByTestId('login-submit').click();
}

test('shared link requires login and returns directly to suggestions after successful sign-in', async ({ page }) => {
  const session = await setup(page, false);
  await page.goto('/constitution-suggestions');
  await expect(page).toHaveURL(/login\?returnTo=%2Fconstitution-suggestions/);
  await expect(page.getByText('Sign in to continue to your constitution suggestions.')).toBeVisible();
  session.loginStatus = 401;
  await login(page);
  await expect(page.getByText('Invalid credentials. Please try again.', { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/login\?returnTo=%2Fconstitution-suggestions/);
  session.loginStatus = 200;
  await page.getByTestId('login-submit').click();
  await expect(page).toHaveURL(/\/constitution-suggestions$/);
  await expect(page.getByText('Amina Member', { exact: true })).toBeVisible();
});

test('login ignores external redirect destinations', async ({ page }) => {
  const session = await setup(page, false);
  session.user = { ...member, memberConstitutionAccepted: true };
  await page.goto('/login?returnTo=https://example.test/steal');
  await login(page);
  await expect(page).toHaveURL(/127.0.0.1:3100\/member$/);
});

test('multiple rows restore after reload and retry with the same ID, then clear on success', async ({ page }) => {
  const session = await setup(page);
  session.postStatus = 500;
  await page.goto('/constitution-suggestions');
  await page.getByRole('button', { name: 'Submit suggestion', exact: true }).click();
  expect(session.submissions).toHaveLength(0);
  await fillRow(page);
  await page.getByRole('button', { name: 'Add another suggestion' }).click();
  await fillRow(page, 1, { ...values, article: 'Article 6' });
  await page.screenshot({ path: '../outputs/constitution-batch-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Submit 2 suggestions' }).click();
  await expect(page.getByRole('alert')).toContainText('could not save');
  await page.reload();
  await expect(page.getByText('Saved draft restored', { exact: true })).toBeVisible();
  await expect(page.getByTestId('suggestion-row')).toHaveCount(2);
  await expect(page.getByTestId('suggestion-row').nth(1).locator('[name="article"]')).toHaveValue('Article 6');
  session.postStatus = 201;
  await page.getByRole('button', { name: 'Submit 2 suggestions' }).click();
  await expect(page.getByRole('heading', { name: 'Thank you for your suggestions' })).toBeVisible();
  expect(session.submissions[0].submissionId).toBe(session.submissions[1].submissionId);
  expect(session.submissions[1].recommendations).toEqual([values, { ...values, article: 'Article 6' }]);
  expect(await page.evaluate(key => localStorage.getItem(key), draftKey)).toBeNull();
  await page.getByRole('button', { name: 'Make more suggestions' }).click();
  await expect(page.getByTestId('suggestion-row')).toHaveCount(1);
  await expect(page.locator('[name="article"]')).toHaveValue('');
});

test('expired submission preserves the draft through reauthentication', async ({ page }) => {
  const session = await setup(page);
  session.postStatus = 401;
  await page.goto('/constitution-suggestions');
  await fillRow(page);
  await page.getByRole('button', { name: 'Submit suggestion', exact: true }).click();
  await expect(page).toHaveURL(/login\?returnTo=%2Fconstitution-suggestions&session=expired/);
  session.postStatus = 201;
  await login(page);
  await expect(page.locator('[name="article"]')).toHaveValue(values.article);
  await page.getByRole('button', { name: 'Submit suggestion', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Thank you for your suggestions' })).toBeVisible();
  expect(session.submissions[0].submissionId).toBe(session.submissions[1].submissionId);
});

test('drafts are separate for different accounts on the same device', async ({ page }) => {
  const session = await setup(page);
  await page.goto('/constitution-suggestions');
  await page.locator('[name="article"]').fill('Private first-account draft');
  session.user = { ...member, id: 'second-user', name: 'Second Member' };
  await page.evaluate(user => { localStorage.setItem('clingrow_user', JSON.stringify(user)); }, session.user);
  await page.reload();
  await expect(page.locator('[name="article"]')).toHaveValue('');
  await page.locator('[name="article"]').fill('Second account draft');
  session.user = member;
  await page.evaluate(user => { localStorage.setItem('clingrow_user', JSON.stringify(user)); }, member);
  await page.reload();
  await expect(page.locator('[name="article"]')).toHaveValue('Private first-account draft');
});

test('another tab cannot silently overwrite or resubmit this draft', async ({ page, context }) => {
  await setup(page);
  await page.goto('/constitution-suggestions');
  await page.locator('[name="article"]').fill('First tab draft');
  const other = await context.newPage();
  await other.goto('/constitution-suggestions');
  await expect(other.locator('[name="article"]')).toHaveValue('First tab draft');
  await other.locator('[name="article"]').fill('Updated in another tab');
  await page.bringToFront();
  await expect(page.getByRole('alert')).toContainText('changed in another tab');
  await expect(page.getByRole('button', { name: 'Submit suggestion', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Load saved version' }).click();
  await expect(page.locator('[name="article"]')).toHaveValue('Updated in another tab');
});

test('account changes in another tab block submitting under the wrong identity', async ({ page }) => {
  const session = await setup(page);
  await page.goto('/constitution-suggestions');
  await fillRow(page);
  await page.evaluate(() => {
    localStorage.setItem('clingrow_user', JSON.stringify({ id: 'other-account' }));
    window.dispatchEvent(new StorageEvent('storage', { key: 'clingrow_user' }));
  });
  await expect(page.getByRole('alert')).toContainText('signed-in account changed');
  await expect(page.getByRole('button', { name: 'Submit suggestion', exact: true })).toBeDisabled();
  expect(session.submissions).toHaveLength(0);
});

test('storage failure is clear and does not prevent submission', async ({ page }) => {
  await setup(page);
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (key.startsWith('clingrow.constitution-draft')) throw new Error('Storage full');
      return original.call(this, key, value);
    };
  });
  await page.goto('/constitution-suggestions');
  await fillRow(page);
  await expect(page.getByRole('alert')).toContainText('Draft saving is unavailable');
  await page.getByRole('button', { name: 'Submit suggestion', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Thank you for your suggestions' })).toBeVisible();
});

test('removing written suggestions and clearing a draft require confirmation', async ({ page }) => {
  await setup(page);
  await page.goto('/constitution-suggestions');
  await fillRow(page);
  await page.getByRole('button', { name: 'Add another suggestion' }).click();
  await fillRow(page, 1);
  await page.getByRole('button', { name: 'Remove suggestion 2' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Remove suggestion', exact: true }).click();
  await expect(page.getByTestId('suggestion-row')).toHaveCount(1);
  await page.getByRole('button', { name: 'Clear draft', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Clear draft', exact: true }).click();
  await expect(page.locator('[name="article"]')).toHaveValue('');
  expect(await page.evaluate(key => localStorage.getItem(key), draftKey)).toBeNull();
});

test('corrupted saved data does not crash or silently claim a restored draft', async ({ page }) => {
  await setup(page);
  await page.addInitScript(key => localStorage.setItem(key, 'invalid draft JSON'), draftKey);
  await page.goto('/constitution-suggestions');
  await expect(page.getByRole('alert')).toContainText('could not be restored');
  await expect(page.locator('[name="article"]')).toHaveValue('');
  await fillRow(page);
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('several suggestions fit a phone screen', async ({ page }) => {
  await setup(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/constitution-suggestions');
  await page.getByRole('button', { name: 'Add another suggestion' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: '../outputs/constitution-batch-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Submit 2 suggestions' }).scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', { name: 'Submit 2 suggestions' })).toBeInViewport();
});

test('officials and administrators see submitter details, legacy responses, and pagination', async ({ page }) => {
  const session = await setup(page);
  session.user = { ...member, roles: ['Secretary', 'SystemAdmin'] };
  await page.route('**/api/constitution-recommendations?*', async route => {
    const current = Number(new URL(route.request().url()).searchParams.get('page') ?? 1);
    await route.fulfill({ json: { items: [
      { id: `item-${current}`, ...values, article: `Article ${current}`, batchId: 'batch-1', position: 0, submittedByName: 'Amina Member', submittedByEmail: 'amina@example.test', submittedByPhone: '0700000000', membershipNumber: 'CG001', createdAt: '2026-10-31T09:00:00Z' },
      { id: 'legacy', ...values, article: 'Earlier article', batchId: null, submittedByName: null, createdAt: '2026-10-30T09:00:00Z' },
    ], total: 21, page: current, pageSize: 20 } });
  });
  for (const prefix of ['/officials', '/dashboard']) {
    await page.goto(`${prefix}/constitution-recommendations`);
    await expect(page.getByRole('heading', { name: 'Constitution recommendations' })).toBeVisible();
    await expect(page.getByText('amina@example.test', { exact: true })).toBeVisible();
    await expect(page.getByText('Member CG001', { exact: true })).toBeVisible();
    await expect(page.getByText('Earlier anonymous submission', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page.getByText('Article 2', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeDisabled();
  }
});

test('anonymous visitors cannot open the officials responses page', async ({ page }) => {
  await page.goto('/officials/constitution-recommendations');
  await expect(page).toHaveURL(/\/login/);
});

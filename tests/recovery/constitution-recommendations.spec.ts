import { test, expect } from '@playwright/test';

const values = {
  article: 'Article 5, Section 2', currentStatement: 'The current statement.',
  proposedAmendment: 'The proposed statement.', justification: 'This makes the rule clearer.',
};

test('public form preserves input after failure and retries without a duplicate submission key', async ({ page }) => {
  const requests: Array<Record<string, string>> = [];
  await page.route('**/api/constitution-recommendations', async (route) => {
    requests.push(route.request().postDataJSON());
    await route.fulfill({ status: requests.length === 1 ? 500 : 201, json: { message: 'Received' } });
  });
  await page.goto('/constitution-suggestions');
  await expect(page.getByRole('heading', { name: 'Help shape our constitution' })).toBeVisible();
  await page.getByRole('button', { name: 'Submit recommendation' }).click();
  expect(requests).toHaveLength(0);
  for (const [key, value] of Object.entries(values)) await page.locator(`#${key}`).fill(value);
  await page.getByRole('button', { name: 'Submit recommendation' }).click();
  await expect(page.getByRole('alert')).toContainText('could not save');
  await expect(page.locator('#justification')).toHaveValue(values.justification);
  await page.getByRole('button', { name: 'Submit recommendation' }).click();
  await expect(page.getByRole('heading', { name: 'Thank you for your recommendation' })).toBeVisible();
  expect(requests[0].submissionId).toBe(requests[1].submissionId);
  expect(requests[1]).toMatchObject(values);
  await page.getByRole('button', { name: 'Suggest another change' }).click();
  await expect(page.locator('#article')).toHaveValue('');
});

test('public form fits a phone screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/constitution-suggestions');
  await expect(page.locator('#article')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Submit recommendation' }).scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', { name: 'Submit recommendation' })).toBeInViewport();
});

test('officials and administrators can view all four columns and paginate', async ({ page }) => {
  const user = { id: 'official-1', name: 'Test Secretary', roles: ['Secretary', 'SystemAdmin'], permissions: [] };
  await page.addInitScript((user) => {
    localStorage.setItem('clingrow_token', 'test');
    localStorage.setItem('clingrow_user', JSON.stringify(user));
  }, user);
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    let body: unknown = { notifications: [], count: 0 };
    if (url.pathname.endsWith('/auth/me')) body = { user };
    if (url.pathname.endsWith('/constitution-recommendations')) {
      const current = Number(url.searchParams.get('page') ?? 1);
      body = { items: [{ id: `item-${current}`, ...values, article: `Article ${current}`, createdAt: '2026-10-30T09:00:00Z' }], total: 21, page: current, pageSize: 20 };
    }
    await route.fulfill({ json: body });
  });
  for (const prefix of ['/officials', '/dashboard']) {
    await page.goto(`${prefix}/constitution-recommendations`);
    await expect(page.getByRole('heading', { name: 'Constitution recommendations' })).toBeVisible();
    await expect(page.getByText(values.justification, { exact: true })).toBeVisible();
    await expect(page.getByText('Article 1', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page.getByText('Article 2', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'Previous', exact: true }).click();
    await expect(page.getByText('Article 1', { exact: true })).toBeVisible();
  }
});

test('anonymous visitors cannot open the officials responses page', async ({ page }) => {
  await page.goto('/officials/constitution-recommendations');
  await expect(page).toHaveURL(/\/login/);
});

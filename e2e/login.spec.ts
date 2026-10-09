import { test, expect } from '@playwright/test';

test('route guard, local login, return destination, and logout', async ({ page }) => {
  const renderErrors: string[] = [];
  page.on('console', message => { if (/Maximum update depth|Invalid hook call/.test(message.text())) renderErrors.push(message.text()); });
  await page.goto('/tokens');
  await expect(page).toHaveURL(/\/login$/);
  await page.getByRole('button', { name: /Continue as dev user/ }).click();
  await expect(page).toHaveURL(/\/tokens$/);
  await expect(page.getByRole('heading', { name: 'Your keys.' })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out', exact: true }).first().click();
  await expect(page).toHaveURL(/\/login$/);
  expect(renderErrors).toEqual([]);
});

test('provider outage offers retry and auth hydration errors stay distinguishable', async ({ page }) => {
  await page.route('**/api/auth/providers', (route) => route.fulfill({ status: 503, body: '{}' }));
  await page.goto('/login');
  await expect(page.getByRole('button', { name: 'Retry sign-in options' })).toBeVisible();
  await page.unroute('**/api/auth/providers');
  await page.getByRole('button', { name: 'Retry sign-in options' }).click();
  await expect(page.getByRole('button', { name: /Continue as dev user/ })).toBeVisible();
});

test('logout reaches another open tab', async ({ context, page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: /Continue as dev user/ }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  const second = await context.newPage();
  await second.goto('/tokens');
  await expect(second.getByRole('heading', { name: 'Your keys.' })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out', exact: true }).first().click();
  await expect(second).toHaveURL(/\/login$/);
});

test('HTTPS cross-site SameSite=None cookie authenticates credentialed requests', async ({ page, context }) => {
  await page.goto('/login');
  const result = await page.evaluate(async () => {
    const base = 'https://127.0.0.2:42443/api';
    const login = await fetch(`${base}/auth/dev-login`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const me = await fetch(`${base}/auth/me`, { credentials: 'include' });
    const identity = await me.json();
    return { login: login.status, user: identity.user };
  });
  expect(result.login).toBe(200);
  expect(result.user).not.toBeNull();
  const cookie = (await context.cookies('https://127.0.0.2:42443')).find((value) => value.name === 'petpal.sid');
  expect(cookie?.secure).toBe(true);
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.sameSite).toBe('None');
});

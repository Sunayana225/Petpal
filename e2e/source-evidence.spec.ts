import { test, expect } from '@playwright/test';

test('food checks expose source review provenance and recall searches disclose coverage', async ({ page, request }) => {
  const recalls = await request.get('http://127.0.0.1:42180/api/recalls?q=not-a-real-brand-xyz');
  expect(recalls.status()).toBe(200);
  const listing = await recalls.json();
  expect(listing.records).toEqual([]);
  expect(listing.source.coverage).toContain('No match is not a safety clearance');
  await page.goto('/');
  await page.getByPlaceholder('Chocolate, bell peppers, salmon…').fill('apple');
  await page.getByRole('button', { name: 'Check safety', exact: true }).click();
  await page.getByText(/Source evidence \(/).click();
  await expect(page.getByText(/Publisher review claims have not been independently verified/)).toBeVisible();
  await expect(page.getByText(/Review: publisher-reported/).first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Original reference' }).first()).toHaveAttribute('href', /^https:\/\//);
});

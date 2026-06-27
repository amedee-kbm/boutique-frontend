import { test, expect } from '@playwright/test'

// Browse → product detail → add to selection → selection screen. This path is
// fully client/SSR and needs no Supabase auth, so it runs unmocked end-to-end.
test('customer can browse, add a piece to the selection, and remove it', async ({ page }) => {
  await page.goto('/')

  // First product in the feed.
  const firstProduct = page.locator('a[href^="/product/"]').first()
  await expect(firstProduct).toBeVisible({ timeout: 30000 })
  await firstProduct.click()

  await expect(page).toHaveURL(/\/product\/.+/)

  // Pick a size if this product offers them (the CTA gates on it).
  const sizeHeading = page.getByText('Size', { exact: true })
  if (await sizeHeading.isVisible().catch(() => false)) {
    await page.locator('button[aria-pressed]').first().click()
  }

  await page.getByRole('button', { name: 'Add to selection' }).click()
  await expect(page.getByText('Added to your selection')).toBeVisible()

  // The bag in the header reflects the count.
  await page
    .getByRole('link', { name: /selection/i })
    .first()
    .click()
  await expect(page).toHaveURL(/\/selection/)

  await expect(page.getByRole('button', { name: /ask about these/i })).toBeVisible()

  // Remove the only item → empty state.
  await page
    .getByRole('button', { name: /^Remove /i })
    .first()
    .click()
  await expect(page.getByText('Your selection is empty')).toBeVisible()
})

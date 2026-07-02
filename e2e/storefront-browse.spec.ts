import { test, expect } from '@playwright/test'

// Browse → product detail → add to bag → bag screen. This path is fully
// client/SSR and needs no Supabase auth, so it runs unmocked end-to-end.
test('customer can browse, add a piece to the bag, and remove it', async ({ page }) => {
  await page.goto('/')

  // First product in the feed.
  const firstProduct = page.locator('a[href^="/product/"]').first()
  await expect(firstProduct).toBeVisible({ timeout: 30000 })
  await firstProduct.click()

  await expect(page).toHaveURL(/\/product\/.+/)

  await page.getByRole('button', { name: 'Add to bag' }).click()

  // Sizes are hidden until "Add to bag": a product with sizes opens a picker
  // sheet (the first button in it is the first size, before the Close button).
  const sizePicker = page.getByText('Select a size', { exact: true })
  if (await sizePicker.isVisible().catch(() => false)) {
    await page.locator('[data-slot="sheet-content"] button').first().click()
  }

  await expect(page.getByText('Added to your bag')).toBeVisible()

  // The bag in the header reflects the count.
  await page.getByRole('link', { name: /^Bag/i }).first().click()
  await expect(page).toHaveURL(/\/bag/)

  await expect(page.getByRole('button', { name: /place order/i })).toBeVisible()

  // Remove the only item → empty state.
  await page
    .getByRole('button', { name: /^Remove /i })
    .first()
    .click()
  await expect(page.getByText('Your bag is empty')).toBeVisible()
})

// Favoriting is account-gated: a guest tap opens the log in / register prompt
// instead of saving. Pure client (no auth needed to reach the prompt).
test('a guest is prompted to log in when favoriting', async ({ page }) => {
  await page.goto('/')

  const heart = page.getByRole('button', { name: /save .* to favorites/i }).first()
  await expect(heart).toBeVisible({ timeout: 30000 })
  await heart.click()

  await expect(page.getByText('Log in to save favorites')).toBeVisible()
})

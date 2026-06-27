import { test, expect } from '@playwright/test'

// Full inquiry funnel: build a selection → "Ask about these" → anonymous sign-in
// → one multi-card message lands in the guest thread. Requires Anonymous
// sign-ins enabled in the Supabase project (Auth → Providers → Anonymous).
test('customer sends an inquiry and sees it in the chat thread', async ({ page }) => {
  await page.goto('/')

  const firstProduct = page.locator('a[href^="/product/"]').first()
  await expect(firstProduct).toBeVisible({ timeout: 30000 })
  await firstProduct.click()

  const sizeHeading = page.getByText('Size', { exact: true })
  if (await sizeHeading.isVisible().catch(() => false)) {
    await page.locator('button[aria-pressed]').first().click()
  }
  await page.getByRole('button', { name: 'Add to selection' }).click()

  await page.goto('/selection')
  await page.getByLabel('Your name').fill('E2E Guest')
  await page.getByRole('button', { name: /ask about these/i }).click()

  await expect(page).toHaveURL(/\/chat/, { timeout: 20000 })
  await expect(page.getByText("I'd love to know more")).toBeVisible()
  // The inquiry renders its product card(s).
  await expect(page.getByRole('link', { name: /view/i }).first()).toBeVisible()
})

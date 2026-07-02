import { test, expect } from '@playwright/test'

// Full order funnel: build a bag → "Place order" → fill contact + delivery
// details → anonymous sign-in writes the order. Requires Anonymous sign-ins
// enabled in the Supabase project (Auth → Providers → Anonymous).
test('customer places a no-pay order from their bag', async ({ page }) => {
  await page.goto('/')

  const firstProduct = page.locator('a[href^="/product/"]').first()
  await expect(firstProduct).toBeVisible({ timeout: 30000 })
  await firstProduct.click()

  await page.getByRole('button', { name: 'Add to bag' }).click()

  // Sizes are hidden until "Add to bag" opens the size-picker sheet.
  const sizePicker = page.getByText('Select a size', { exact: true })
  if (await sizePicker.isVisible().catch(() => false)) {
    await page.locator('[data-slot="sheet-content"] button').first().click()
  }

  await page.goto('/bag')
  await page.getByRole('button', { name: /place order/i }).click()

  await page.getByLabel('Your name').fill('E2E Guest')
  await page.getByLabel('Phone number').fill('+250788000000')
  await page.getByLabel('Delivery address').fill('KN 5 Rd, Kigali')
  await page.getByRole('button', { name: /confirm order/i }).click()

  await expect(page.getByText('Order placed.')).toBeVisible({ timeout: 20000 })
})

// A guest can also start a plain chat with no bag — just a name.
test('customer starts a chat with no bag', async ({ page }) => {
  await page.goto('/chat')

  await page.getByLabel('Your name').fill('E2E Chatter')
  await page.getByRole('button', { name: /start chatting/i }).click()

  await expect(page.getByPlaceholder('Type a message…')).toBeVisible({ timeout: 20000 })
})

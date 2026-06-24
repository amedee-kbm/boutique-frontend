import { test, expect } from '@playwright/test'

const email = process.env.ADMIN_TEST_EMAIL!
const password = process.env.ADMIN_TEST_PASSWORD!

// A minimal 1×1 PNG so the upload hits real Supabase Storage without a committed binary fixture.
const pngBuffer = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
)

test.beforeEach(async ({ page }) => {
  await page.goto('/admin/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
})

async function deleteProduct(page: import('@playwright/test').Page, name: string) {
  await page.goto('/admin/products')
  const row = page.getByRole('listitem').filter({ hasText: name })
  await row.getByRole('button', { name: /delete product/i }).click()
  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  await expect(page.getByRole('link', { name })).toHaveCount(0)
}

test('admin can create a product through the single-screen editor and delete it', async ({
  page,
}) => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const name = `E2E Product ${suffix}`

  await page.goto('/admin/products/new')

  await page.getByLabel('Product title').fill(name)

  // Price lives in a focused sub-screen (P3 FieldRow → P4 SubScreen).
  await page.getByRole('button', { name: /set price/i }).click()
  await page.getByLabel('Price').fill('19.99')
  await page.getByRole('button', { name: 'Done' }).click()

  await page.getByRole('button', { name: 'Save' }).click()

  // Save lands on the edit page titled with the product name.
  await expect(page).toHaveURL(/\/admin\/products\/.+\/edit/, { timeout: 20000 })
  await expect(page.getByRole('heading', { name })).toBeVisible()

  await page.goto('/admin/products')
  await expect(page.getByRole('link', { name })).toBeVisible()

  await deleteProduct(page, name)
})

test('admin can add details and a photo in one go, and the photo persists', async ({ page }) => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const name = `E2E Photo Product ${suffix}`

  await page.goto('/admin/products/new')

  await page.getByLabel('Product title').fill(name)

  await page.getByRole('button', { name: /set price/i }).click()
  await page.getByLabel('Price').fill('24.99')
  await page.getByRole('button', { name: 'Done' }).click()

  // Stage a photo inline — it should NOT upload yet, only preview.
  await page.locator('input[type="file"]').setInputFiles({
    name: 'photo.png',
    mimeType: 'image/png',
    buffer: pngBuffer,
  })
  await expect(page.getByLabel('Remove image')).toBeVisible()

  // One Save: creates the product and uploads the staged photo.
  await page.getByRole('button', { name: 'Save' }).click()

  await expect(page).toHaveURL(/\/admin\/products\/.+\/edit/, { timeout: 20000 })
  await expect(page.getByRole('heading', { name })).toBeVisible()

  // The photo persisted: the edit page's image manager renders its alt-text field.
  await expect(page.getByLabel('Image alt text')).toBeVisible({ timeout: 20000 })

  await deleteProduct(page, name)
})

import { test, expect } from '@playwright/test'

const email = process.env.ADMIN_TEST_EMAIL!
const password = process.env.ADMIN_TEST_PASSWORD!

test.beforeEach(async ({ page }) => {
  await page.goto('/admin/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
})

test('admin can create a product and then delete it', async ({ page }) => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const name = `E2E Product ${suffix}`

  await page.goto('/admin/products/new')

  await page.getByLabel('Name').fill(name)
  await page.getByLabel('Price').fill('19.99')
  await page.getByLabel('Slug').fill(`e2e-product-${suffix}`)
  await page.getByRole('button', { name: /create product/i }).click()

  // On create we land on the edit page titled with the product name
  await expect(page).toHaveURL(/\/admin\/products\/.+\/edit/)
  await expect(page.getByRole('heading', { name })).toBeVisible()

  // It appears in the products list
  await page.goto('/admin/products')
  await expect(page.getByRole('link', { name })).toBeVisible()

  // Clean up: delete it so the test is repeatable
  const row = page.getByRole('row').filter({ hasText: name })
  await row.getByRole('button', { name: /delete product/i }).click()
  await page.getByRole('button', { name: 'Delete', exact: true }).click()

  await expect(page.getByRole('link', { name })).toHaveCount(0)
})

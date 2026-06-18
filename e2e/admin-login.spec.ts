import { test, expect } from '@playwright/test'

const email = process.env.ADMIN_TEST_EMAIL!
const password = process.env.ADMIN_TEST_PASSWORD!

test('admin can log in and reach the dashboard', async ({ page }) => {
  await page.goto('/admin/login')

  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()

  await expect(page).toHaveURL(/\/admin$/)
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
})

test('unauthenticated visitor is redirected to the login page', async ({ page }) => {
  await page.goto('/admin/products')
  await expect(page).toHaveURL(/\/admin\/login/)
})

test('wrong password shows an error and stays on the login page', async ({ page }) => {
  await page.goto('/admin/login')

  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill('definitely-wrong-password')
  await page.getByRole('button', { name: /sign in/i }).click()

  await expect(page.getByText(/invalid login credentials/i)).toBeVisible()
  await expect(page).toHaveURL(/\/admin\/login/)
})

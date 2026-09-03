import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'

const { Then } = createBdd()

Then('I should see the footer', async ({ page }) => {
  await expect(page.locator('.app-footer')).toBeVisible()
})

Then('the footer should contain {string}', async ({ page }, text) => {
  const footer = page.locator('.app-footer')
  await expect(footer.getByText(text).first()).toBeVisible()
})

Then('the footer should contain a {string} link', async ({ page }, linkText) => {
  const footer = page.locator('.app-footer')
  await expect(footer.getByText(linkText).first()).toBeVisible()
})

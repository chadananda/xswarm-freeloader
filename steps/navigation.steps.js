import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'

const { Then, When } = createBdd()

Then('I should see the navigation sidebar', async ({ page }) => {
  await expect(page.locator('.nav-sidebar')).toBeVisible()
})

Then('the sidebar should contain {string} link', async ({ page }, name) => {
  const nav = page.locator('.nav-sidebar')
  await expect(nav.getByText(name).first()).toBeVisible()
})

Then('the sidebar should show {string} brand', async ({ page }, text) => {
  await expect(page.locator('.brand-name')).toHaveText(text)
})

Then('the sidebar should show {string} sub-brand', async ({ page }, text) => {
  await expect(page.locator('.brand-sub')).toHaveText(text)
})

Then('the {string} nav link should be active', async ({ page }, name) => {
  const activeLink = page.locator('.nav-link.active')
  await expect(activeLink).toBeVisible()
  await expect(activeLink.getByText(name)).toBeVisible()
})

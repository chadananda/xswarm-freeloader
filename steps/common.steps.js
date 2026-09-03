import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import AxeBuilder from '@axe-core/playwright'

const { Given, When, Then } = createBdd()

// --- Navigation ---

Given('I navigate to the onboarding page', async ({ page }) => {
  await page.goto('/#/onboarding')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1500)
})

Given('I am logged into the dashboard', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)
})

Given('I navigate to the overview page', async ({ page }) => {
  await page.goto('/#/overview')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(800)
})

Given('I navigate to the settings page', async ({ page }) => {
  await page.goto('/#/settings')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(800)
})

Given('I navigate to the opportunities page', async ({ page }) => {
  await page.goto('/#/opportunities')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(800)
})

Given('I navigate to {string}', async ({ page }, url) => {
  await page.goto(url)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(800)
})

Given('I wait for the page to load', async ({ page }) => {
  await page.waitForTimeout(1000)
})

// --- Interactions ---

When('I click the {string} button', async ({ page }, name) => {
  await page.getByRole('button', { name }).click()
  await page.waitForTimeout(500)
})

When('I click the {string} link', async ({ page }, name) => {
  await page.getByRole('link', { name }).click()
  await page.waitForTimeout(500)
})

When('I select {string} from the email provider dropdown', async ({ page }, option) => {
  const select = page.locator('select').filter({ has: page.locator('option', { hasText: 'Skip for now' }) })
  await select.selectOption({ label: option })
  await page.waitForTimeout(300)
})

// --- Assertions: Headings ---

Then('I should see the {string} heading', async ({ page }, name) => {
  await expect(page.getByText(name).first()).toBeVisible()
})

// --- Assertions: Text ---

Then('I should see {string}', async ({ page }, text) => {
  await expect(page.getByText(text).first()).toBeVisible()
})

Then('I should see {string} label', async ({ page }, text) => {
  await expect(page.getByText(text).first()).toBeVisible()
})

Then('I should see {string} stat', async ({ page }, text) => {
  await expect(page.getByText(text).first()).toBeVisible()
})

Then('I should see {string} badge text', async ({ page }, text) => {
  await expect(page.getByText(text).first()).toBeVisible()
})

Then('I should see {string} stat label', async ({ page }, text) => {
  await expect(page.getByText(text).first()).toBeVisible()
})

Then('I should see {string} link', async ({ page }, text) => {
  await expect(page.getByText(text).first()).toBeVisible()
})

// --- Assertions: Buttons ---

Then('I should see the {string} button', async ({ page }, name) => {
  await expect(page.getByRole('button', { name }).first()).toBeVisible()
})

Then('I should see the {string} link', async ({ page }, name) => {
  await expect(page.getByText(name).first()).toBeVisible()
})

// --- Assertions: URL ---

Then('the URL hash should be {string}', async ({ page }, hash) => {
  const actual = await page.evaluate(() => window.location.hash)
  expect(actual).toBe(hash)
})

// --- Assertions: Endpoint ---

Then('I should see the endpoint {string}', async ({ page }, endpoint) => {
  await expect(page.getByText(endpoint).first()).toBeVisible()
})

// --- Accessibility ---

Then('the page should have no critical accessibility violations', async ({ page }) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .disableRules(['color-contrast'])
    .analyze()
  const critical = results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious')
  expect(critical).toEqual([])
})

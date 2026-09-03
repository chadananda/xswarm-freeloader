import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'

const { Then } = createBdd()

Then('I should see {int} timeline dots', async ({ page }, count) => {
  const dots = page.locator('.timeline-dot')
  await expect(dots).toHaveCount(count)
})

Then('the timeline dots should display {string}, {string}, {string}', async ({ page }, a, b, c) => {
  const dots = page.locator('.timeline-dot')
  const texts = await dots.allTextContents()
  expect(texts).toEqual([a, b, c])
})

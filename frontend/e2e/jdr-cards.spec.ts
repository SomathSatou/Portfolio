import { expect, test } from '@playwright/test'

test.describe('JDR parchment cards', () => {
  test('matches the light parchment reference', async ({ page }) => {
    await page.goto('/#/jdr/card-preview')
    await expect(page).toHaveScreenshot('jdr-cards-light.png', { fullPage: true })
  })

  test('matches the dark grimoire reference', async ({ page }) => {
    await page.goto('/#/jdr/card-preview')
    await page.locator('html').evaluate((element) => element.classList.add('dark'))
    await expect(page).toHaveScreenshot('jdr-cards-dark.png', { fullPage: true })
  })
})

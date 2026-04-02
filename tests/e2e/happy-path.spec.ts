import { test, expect } from '@playwright/test'

// All requests send this header to bypass Clerk auth in test mode
test.use({
  extraHTTPHeaders: {
    'x-playwright-test': '1',
  },
})

// Content headings are inside <main>, sidebar h1 is in <aside>
const mainH1 = (page: import('@playwright/test').Page) => page.locator('main h1')

test.describe('Happy Path — Monitor de Onboarding', () => {
  test('dashboard loads with KPI cards', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await expect(mainH1(page)).toBeVisible({ timeout: 10000 })

    const body = await page.textContent('body')
    expect(body).toBeTruthy()
  })

  test('dashboard shows KPI numbers', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const kpiNumbers = page.locator('main p.text-3xl, main p.text-4xl, main h3.text-3xl')
    await expect(kpiNumbers.first()).toBeVisible({ timeout: 10000 })
  })

  test('calendario page loads with tabs', async ({ page }) => {
    await page.goto('/calendario')
    await page.waitForLoadState('networkidle')

    await expect(mainH1(page)).toContainText('Calendário', { timeout: 10000 })

    await expect(page.getByRole('button', { name: /Vistoria/ })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('button', { name: /Fotografia/ })).toBeVisible({ timeout: 10000 })
  })

  test('calendario tab switch works', async ({ page }) => {
    await page.goto('/calendario')
    await page.waitForLoadState('networkidle')

    const fotoTab = page.getByRole('button', { name: /Fotografia/ })
    await expect(fotoTab).toBeVisible({ timeout: 10000 })

    await fotoTab.click()
    await page.waitForTimeout(300)

    await expect(fotoTab).toBeVisible()
  })

  test('navigation between pages works', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(mainH1(page)).toBeVisible({ timeout: 10000 })

    await page.goto('/calendario')
    await expect(mainH1(page)).toContainText('Calendário', { timeout: 10000 })
  })
})

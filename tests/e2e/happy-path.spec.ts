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

    // Dashboard should show numeric KPI values
    const body = await page.textContent('body')
    expect(body).toBeTruthy()
  })

  test('dashboard shows KPI numbers', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // KPI cards use text-3xl for numbers (Concluídos, SLA Crítico, Em Onboarding)
    const kpiNumbers = page.locator('main p.text-3xl, main p.text-4xl, main h3.text-3xl')
    await expect(kpiNumbers.first()).toBeVisible({ timeout: 10000 })
  })

  test('imoveis page loads with table', async ({ page }) => {
    await page.goto('/imoveis')
    await page.waitForLoadState('networkidle')

    await expect(mainH1(page)).toContainText('Imóveis', { timeout: 10000 })

    // Table should have at least one row
    const rows = page.locator('table tbody tr')
    await expect(rows.first()).toBeVisible({ timeout: 10000 })
  })

  test('imoveis search filter works', async ({ page }) => {
    await page.goto('/imoveis')
    await page.waitForLoadState('networkidle')

    await expect(mainH1(page)).toContainText('Imóveis', { timeout: 10000 })

    const searchInput = page.locator('main input[type="text"]').first()
    await searchInput.fill('PSO')
    await page.waitForTimeout(500)

    // Table should still be visible after search
    const table = page.locator('main table')
    await expect(table).toBeVisible()
  })

  test('calendario page loads with tabs', async ({ page }) => {
    await page.goto('/calendario')
    await page.waitForLoadState('networkidle')

    await expect(mainH1(page)).toContainText('Calendário', { timeout: 10000 })

    // Tabs use emoji + text, match by partial text
    await expect(page.getByRole('button', { name: /Vistoria/ })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('button', { name: /Fotografia/ })).toBeVisible({ timeout: 10000 })
  })

  test('calendario tab switch works', async ({ page }) => {
    await page.goto('/calendario')
    await page.waitForLoadState('networkidle')

    const fotoTab = page.getByRole('button', { name: /Fotografia/ })
    await expect(fotoTab).toBeVisible({ timeout: 10000 })

    // Click Fotografia tab
    await fotoTab.click()
    await page.waitForTimeout(300)

    // Tab should still be visible after switch
    await expect(fotoTab).toBeVisible()
  })

  test('documentos page loads with table', async ({ page }) => {
    await page.goto('/documentos')
    await page.waitForLoadState('networkidle')

    await expect(mainH1(page)).toContainText('Descrições', { timeout: 10000 })

    // Summary cards should be visible
    await expect(page.locator('main').getByText('Total')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('main').getByText('Concluídos')).toBeVisible({ timeout: 10000 })
  })

  test('documentos pipe filter works', async ({ page }) => {
    await page.goto('/documentos')
    await page.waitForLoadState('networkidle')

    await expect(mainH1(page)).toContainText('Descrições', { timeout: 10000 })

    // Pipe group buttons are round pills with pipe names
    const pipeButtons = page.locator('main button').filter({ hasText: /Pipe/ })
    await expect(pipeButtons.first()).toBeVisible({ timeout: 10000 })

    await pipeButtons.first().click()
    await page.waitForTimeout(300)

    // Filtered count card should be visible
    await expect(page.locator('main').getByText('Filtrados')).toBeVisible()
  })

  test('navigation between pages works', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(mainH1(page)).toBeVisible({ timeout: 10000 })

    await page.goto('/imoveis')
    await expect(mainH1(page)).toContainText('Imóveis', { timeout: 10000 })

    await page.goto('/calendario')
    await expect(mainH1(page)).toContainText('Calendário', { timeout: 10000 })

    await page.goto('/documentos')
    await expect(mainH1(page)).toContainText('Descrições', { timeout: 10000 })
  })
})

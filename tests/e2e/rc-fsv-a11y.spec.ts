import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('RC-FSV-01 Arabic workspace has no serious axe violations', async ({ page }) => {
  const base = process.env.PXSIBASEURL!
  await page.goto(`${base}/ar/workspace`)
  await expect(page.getByRole('heading', { name: 'سجل العمل التنفيذي' })).toBeVisible()
  const results = await new AxeBuilder({ page }).analyze()
  const serious = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical')
  expect(serious, JSON.stringify(serious)).toEqual([])
})

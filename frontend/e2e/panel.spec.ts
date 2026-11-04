import { expect, test } from '@playwright/test'

// Requiere la API en :8000 (python servidor.py). En móvil el panel de parámetros abre como hoja inferior.
test('la hoja de parámetros abre y cierra en móvil (390 px)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/observatorio')
  const abrir = page.getByRole('button', { name: 'Parámetros del modelo' })
  await abrir.click()
  const hoja = page.getByRole('dialog', { name: 'Parámetros del modelo' })
  await expect(hoja).toBeVisible()
  await page.screenshot({ path: process.env.CAPTURA_HOJA ?? 'test-results/hoja-movil.png' })
  const caja = await hoja.boundingBox()
  expect(caja!.x).toBeGreaterThanOrEqual(0)
  expect(caja!.x + caja!.width).toBeLessThanOrEqual(390.5)
  await page.keyboard.press('Escape')
  await expect(hoja).toBeHidden()
  await expect(abrir).toBeFocused()
})

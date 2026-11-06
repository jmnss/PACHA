import { expect, test } from '@playwright/test'

// Requiere `bash scripts/construir_pages.sh` previo (frontend/dist-pages).
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('nisar.idioma', 'es'))
})

test('el motor responde salud y cambio en Chromium', async ({ page }) => {
  page.on('console', (m) => { if (m.type() === 'error') console.log('consola:', m.text()) })
  page.on('pageerror', (e) => console.log('pageerror:', e.message))
  await page.goto('./')
  await expect(page.getByRole('region', { name: 'Aviso de datos de demostración' })).toBeVisible({ timeout: 120_000 })
  // el comparador de la historia necesita /cambio: aparece su lienzo
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 120_000 })
})

test('el recorrido incrusta pantallas con la base', async ({ page }) => {
  await page.goto('recorrido')
  const marco = page.locator('iframe')
  await expect(marco).toBeVisible({ timeout: 120_000 })
  const src = await marco.getAttribute('src')
  expect(src?.startsWith('/NISAR-Ecuador/')).toBe(true)
  expect(src).toContain('incrustado=1')
  await expect(page.frameLocator('iframe').getByRole('region', { name: 'Aviso de datos de demostración' }))
    .toBeVisible({ timeout: 120_000 })
})

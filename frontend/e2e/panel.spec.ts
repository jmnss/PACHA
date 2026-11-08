import { expect, test } from '@playwright/test'

// Requiere la API en :8000 (python servidor.py). En móvil el panel de parámetros abre como hoja inferior.
test('la hoja de parámetros abre y cierra en móvil (390 px)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/observatorio')
  const abrir = page.getByRole('button', { name: 'Más acciones' })
  await abrir.click()
  await page.getByRole('menuitem', { name: 'Parámetros del modelo' }).click()
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

for (const [idioma, observa] of [['es', 'Qué observa el radar'], ['en', 'What the radar observes']] as const) {
  test(`en móvil el mapa del Observatorio empieza a la vista y el observable va bajo el mapa (390x844, ${idioma})`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`/observatorio?idioma=${idioma}`)
    const mapa = page.locator('.vista-mapa__mapa')
    await expect(mapa).toBeVisible()
    const caja = await mapa.boundingBox()
    // Medido a 390x844: el mapa empieza en y=478; el umbral deja ~20 px de margen contra regresiones del encabezado.
    expect(caja!.y).toBeLessThan(500)
    expect(caja!.y + caja!.height).toBeGreaterThan(844)
    // No se pierde información: la línea del observable pasa a la tarjeta de ayuda, bajo el mapa.
    const observable = page.locator('.ayuda-radar__observable')
    await expect(observable).toContainText(observa)
    expect((await observable.boundingBox())!.y).toBeGreaterThan(caja!.y)
    await expect(page.locator('header.cabecera').getByText(observa)).toHaveCount(0)
  })
}

test('el mapa del Observatorio tiene alto propio en escritorio y en móvil', async ({ page }) => {
  for (const [ancho, alto] of [[1440, 900], [390, 844]]) {
    await page.setViewportSize({ width: ancho, height: alto })
    await page.goto('/observatorio')
    const lienzo = page.getByTestId('mapa')
    await expect(lienzo).toBeVisible()
    const caja = await lienzo.boundingBox()
    expect(caja!.height).toBeGreaterThan(300)
  }
})

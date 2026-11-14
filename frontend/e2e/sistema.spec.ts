import { expect, test, type Locator } from '@playwright/test'

// Requiere la API en :8000 (python servidor.py): `npm run preview` la usa como proxy.
// Comprueba en navegador real que cada línea de selección de 1 px (accent) se PINTA:
// tiene tamaño, está dentro del área visible de su contenedor y es lo que hay bajo su centro
// (elementFromPoint ignora lo recortado por overflow).
async function lineaVisible(linea: Locator, contenedor: Locator) {
  await expect(linea).toHaveCount(1)
  const r = await linea.evaluate((el) => {
    const b = el.getBoundingClientRect()
    const c = el.closest('[data-contenedor]')!.getBoundingClientRect()
    const golpe = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2)
    return {
      ancho: b.width, alto: b.height,
      dentro: b.left >= c.left - 0.5 && b.right <= c.right + 0.5 && b.top >= c.top - 0.5 && b.bottom <= c.bottom + 0.5,
      encima: golpe === el,
      color: getComputedStyle(el).backgroundColor,
    }
  })
  expect(Math.min(r.ancho, r.alto)).toBeGreaterThanOrEqual(1) // línea de 1 px
  expect(Math.max(r.ancho, r.alto)).toBeGreaterThan(1) // con largo
  expect(r.dentro).toBe(true)
  expect(r.encima).toBe(true)
  expect(r.color).toBe('rgb(229, 185, 60)')
  await expect(contenedor).toBeVisible()
}

for (const [nombre, ancho, alto] of [['escritorio', 1440, 900], ['móvil', 390, 844]] as const) {
  test(`la línea de la pestaña activa se pinta (${nombre})`, async ({ page }) => {
    await page.setViewportSize({ width: ancho, height: alto })
    await page.goto('/_sistema')
    const tablist = page.getByRole('tablist', { name: 'Vistas del observatorio' })
    await tablist.evaluate((el) => el.setAttribute('data-contenedor', ''))
    await tablist.scrollIntoViewIfNeeded()
    await lineaVisible(tablist.locator('.pestanas__linea'), tablist)
    await expect(tablist.locator('.pestanas__linea')).toHaveCount(1)
  })

  test(`la línea del destino activo del riel se pinta (${nombre})`, async ({ page }) => {
    await page.setViewportSize({ width: ancho, height: alto })
    await page.goto('/')
    const nav = page.getByRole('navigation', { name: 'Principal' })
    await nav.evaluate((el) => el.setAttribute('data-contenedor', ''))
    const clase = ancho < 700 ? '.riel__linea--etiqueta' : '.riel__linea--riel'
    await lineaVisible(nav.locator(clase), nav)
  })
}

test('el mapa de /_sistema crea su lienzo WebGL sin internet', async ({ page }) => {
  await page.route(/openfreemap|openstreetmap/, (r) => r.abort())
  await page.goto('/_sistema')
  const mapa = page.getByTestId('mapa')
  await mapa.scrollIntoViewIfNeeded()
  await expect(mapa.locator('canvas.maplibregl-canvas')).toHaveCount(1)
})

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
  expect(src?.startsWith(process.env.PAGES_BASE ?? '/PACHA/')).toBe(true)
  expect(src).toContain('incrustado=1')
  await expect(page.frameLocator('iframe').getByRole('region', { name: 'Aviso de datos de demostración' }))
    .toBeVisible({ timeout: 120_000 })
})

const BANDA = { name: 'Aviso de datos de demostración' }
const SIN_MOTOR = '**/motor/pyodide/pyodide.asm.wasm'
// Playwright no intercepta las peticiones de un SharedWorker: para forzar fallos se usa el Worker dedicado
// (el mismo camino que Chrome Android, sin SharedWorker).
const SIN_COMPARTIDO = () => { Object.defineProperty(window, 'SharedWorker', { value: undefined }) }

test('la portada se ve sin esperar al motor', async ({ page }) => {
  await page.addInitScript(SIN_COMPARTIDO)
  await page.route(SIN_MOTOR, () => new Promise(() => {})) // el motor nunca termina de cargar
  await page.goto('./')
  await expect(page.getByRole('region', BANDA)).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText(/Preparando el motor de cálculo/)).toHaveCount(0)
})

test('recargar una ruta profunda funciona', async ({ page }) => {
  await page.goto('observatorio?escenario=ec_loja&vista=comparar')
  await expect(page.getByRole('region', BANDA)).toBeVisible({ timeout: 120_000 })
  await page.reload()
  await expect(page.getByRole('region', BANDA)).toBeVisible({ timeout: 120_000 })
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 120_000 })
})

test('el motor calcula un escenario nuevo del Observatorio', async ({ page }) => {
  await page.goto('observatorio?escenario=ec_la_segua')
  await page.getByLabel('Semilla').fill('11')
  await expect(page).toHaveURL(/escenario=ec_la_segua(~|%7E)/, { timeout: 120_000 })
})

test('el simulador crea un mundo y desata un incendio con el motor', async ({ page }) => {
  await page.goto('simulador?lat=-4.05&lon=-79.25&dem=0&ext=60')
  const tablero = page.getByRole('group', { name: /Tablero del simulador/ })
  await expect(tablero).toBeVisible({ timeout: 120_000 })
  await tablero.focus()
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/i=64&j=64/)
  await expect(page.getByRole('heading', { name: /Incendio/ }).first()).toBeVisible({ timeout: 120_000 })
  await expect(page.getByText(/Lo que vería un radar como NISAR/)).toBeVisible({ timeout: 120_000 })
})

test('un enlace profundo del simulador recrea el evento', async ({ page }) => {
  await page.goto('simulador?lat=-4.05&lon=-79.25&dem=0&ext=60&h=incendio&i=64&j=64')
  await expect(page.getByRole('heading', { name: /Incendio/ }).first()).toBeVisible({ timeout: 120_000 })
  await expect(page.getByText(/Lo que vería un radar como NISAR/)).toBeVisible({ timeout: 120_000 })
})

test('si el motor no carga, se avisa y lo precalculado sigue', async ({ page }) => {
  await page.addInitScript(SIN_COMPARTIDO)
  await page.route('**/motor/app-*.zip', (r) => r.fulfill({ status: 404 }))
  await page.goto('observatorio?escenario=ec_la_segua')
  await expect(page.getByRole('region', BANDA)).toBeVisible({ timeout: 120_000 })
  await page.getByLabel('Semilla').fill('12')
  await expect(page.getByRole('alert').filter({ hasText: /El motor de cálculo no pudo cargarse/ })).toBeVisible({ timeout: 120_000 })
  await expect(page.getByRole('region', BANDA)).toBeVisible()
})

for (const [ancho, alto] of [[1440, 900], [768, 1024], [390, 844]]) {
  test(`captura del aviso del motor a ${ancho}`, async ({ page }) => {
    await page.addInitScript(SIN_COMPARTIDO)
    await page.setViewportSize({ width: ancho, height: alto })
    await page.route(SIN_MOTOR, () => new Promise(() => {}))
    await page.goto('observatorio?escenario=ec_la_segua')
    await expect(page.getByRole('region', BANDA)).toBeVisible({ timeout: 30_000 })
    if (ancho >= 700) await page.getByLabel('Semilla').fill('13')
    else await page.goto('simulador?lat=-4.05&lon=-79.25&dem=0&ext=60')
    await expect(page.getByText(/Preparando el motor de cálculo/)).toBeVisible({ timeout: 60_000 })
    await page.screenshot({ path: `../docs/capturas-nuevas/aviso-motor/${ancho}.png` })
  })
}

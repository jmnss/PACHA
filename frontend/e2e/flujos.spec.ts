import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

// Requiere `npm run build` previo (servidor.py sirve frontend/dist) y los datos de demostración generados.
const ANCHOS = [{ nombre: 'escritorio 1440', ancho: 1440, alto: 900 }, { nombre: 'móvil 390', ancho: 390, alto: 844 }]

const hayDesborde = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)

for (const { nombre, ancho, alto } of ANCHOS) {
  test.describe(`flujos · ${nombre}`, () => {
    test.use({ viewport: { width: ancho, height: alto } })

    for (const ruta of ['/', '/explorar/observatorio']) {
      test(`banda de demostración visible y sin cerrar en ${ruta}`, async ({ page }) => {
        await page.goto(ruta)
        const banda = page.getByRole('region', { name: 'Aviso de datos de demostración' })
        await expect(banda).toBeVisible()
        await expect(banda.getByRole('button')).toHaveCount(1) // solo «Qué significa»
        await expect(banda.getByRole('button', { name: 'Qué significa' })).toBeVisible()
        await expect(banda.getByRole('button', { name: /cerrar|descartar|ocultar/i })).toHaveCount(0)
      })
    }

    test('Historias: el comparador se mueve con el teclado', async ({ page }) => {
      await page.goto('/explorar/historias')
      const divisor = page.getByRole('slider', { name: 'Divisor entre antes y después' }).first()
      await expect(divisor).toBeAttached({ timeout: 30_000 })
      await divisor.scrollIntoViewIfNeeded()
      await divisor.focus()
      const valor = async () => Number(await divisor.getAttribute('aria-valuenow'))
      const v0 = await valor()
      await page.keyboard.press('ArrowRight')
      await expect.poll(valor).toBeCloseTo(v0 + 1, 5)
      await page.keyboard.press('Shift+ArrowRight')
      await expect.poll(valor).toBeCloseTo(v0 + 11, 5)
    })

    test('Observatorio: con paso de 1 h el mapa anima los fotogramas del modelo', async ({ page }) => {
      await page.goto('/explorar/observatorio')
      await page.getByRole('radio', { name: 'Modelo en el tiempo' }).click()
      await page.getByRole('combobox', { name: 'Paso' }).selectOption('60')
      const rotulo = page.getByText(/^Modelo · /)
      await expect(rotulo).toBeVisible({ timeout: 60_000 })
      const t0 = await rotulo.textContent()
      await page.getByRole('combobox', { name: 'Velocidad' }).selectOption('rapida')
      await page.getByRole('button', { name: 'Reproducir' }).click()
      await expect.poll(async () => rotulo.textContent(), { timeout: 15_000 }).not.toBe(t0)
      await page.getByRole('button', { name: 'Pausa' }).click()
    })

    test('Observatorio: Play avanza el instante de la cinta', async ({ page }) => {
      await page.goto('/explorar/observatorio')
      const cinta = page.getByRole('slider', { name: 'Instante de la cinta de pasadas' })
      await expect(cinta).toBeVisible({ timeout: 30_000 })
      const texto = () => cinta.getAttribute('aria-valuetext')
      const t0 = await texto()
      const play = page.getByRole('button', { name: 'Reproducir' })
      await expect(play).toBeEnabled()
      await play.click()
      await expect.poll(texto, { timeout: 15_000 }).not.toBe(t0)
      await page.getByRole('button', { name: 'Pausa' }).click()
      await expect(page.getByRole('button', { name: 'Reproducir' })).toBeVisible()
    })

    test('Observatorio · comparar: un cuadrante se mide y el CSV lleva su origen', async ({ page }) => {
      await page.goto('/explorar/observatorio?vista=comparar')
      const gesto = page.getByTestId('comparador-gesto')
      await expect(gesto).toBeVisible({ timeout: 30_000 })
      await gesto.scrollIntoViewIfNeeded()
      const caja = (await gesto.boundingBox())!
      const x = (f: number) => caja.x + caja.width * f
      const y = (f: number) => caja.y + caja.height * f
      await page.mouse.move(x(0.3), y(0.3))
      await page.mouse.down()
      await page.mouse.move(x(0.5), y(0.5), { steps: 5 })
      await page.mouse.move(x(0.7), y(0.7), { steps: 5 })
      await page.mouse.up()
      const descargar = page.getByRole('button', { name: 'Descargar CSV' })
      await expect(descargar).toBeVisible({ timeout: 30_000 })
      const [descarga] = await Promise.all([page.waitForEvent('download'), descargar.click()])
      const contenido = (await readFile((await descarga.path())!, 'utf8')).replace(new RegExp('^' + String.fromCharCode(0xfeff)), '')
      expect(contenido.startsWith('# origen: sintético')).toBe(true)
      expect(contenido).toContain('DATOS DE DEMOSTRACIÓN: no son observaciones reales de NISAR')
    })

    test('Observatorio · comparar: de un punto a su evolución en Serie', async ({ page }) => {
      await page.goto('/explorar/observatorio?escenario=ec_la_segua&vista=comparar')
      const gesto = page.getByTestId('comparador-gesto')
      await expect(gesto).toBeVisible({ timeout: 30_000 })
      await gesto.scrollIntoViewIfNeeded()
      const caja = (await gesto.boundingBox())!
      await page.mouse.click(caja.x + caja.width * 0.3, caja.y + caja.height * 0.5)
      const enlace = page.getByRole('link', { name: 'Ver su evolución en Serie' })
      await expect(enlace).toBeVisible({ timeout: 30_000 })
      await enlace.click()
      await expect(page).toHaveURL(/vista=serie/)
      await expect(page).toHaveURL(/p=/)
      const tarjeta = page.locator('section', { has: page.getByRole('heading', { name: 'En la selección' }) })
      await expect(tarjeta.getByRole('figure')).toBeVisible({ timeout: 60_000 })
    })

    test('Observatorio · mapa: un marcador del catálogo lleva a su escenario sin crear uno derivado', async ({ page }) => {
      const posts: string[] = []
      page.on('request', (r) => { if (r.method() === 'POST' && r.url().includes('/api/simulacion/escenario')) posts.push(r.url()) })
      await page.goto('/explorar/observatorio')
      const menu = page.getByRole('button', { name: 'Más acciones' })
      const todo = page.getByRole('button', { name: 'Ver todo Ecuador' }).or(menu)
      await expect(todo).toBeVisible({ timeout: 30_000 })
      if (await menu.isVisible()) {
        await menu.click()
        await page.getByRole('menuitem', { name: 'Ver todo Ecuador' }).click()
      } else {
        await todo.click()
      }
      const marcador = page.getByRole('button', { name: 'Bosques andinos de Loja' })
      await expect(marcador).toBeVisible({ timeout: 30_000 })
      await marcador.click()
      await expect(page).toHaveURL(/escenario=ec_loja(&|$)/)
      // Si el clic llegara al mapa, crearía un escenario derivado (POST) y la URL pasaría a `ec_loja~…`.
      await page.waitForLoadState('networkidle')
      await expect(page.getByText('Calculando la escena')).toHaveCount(0)
      expect(posts).toHaveLength(0)
      await expect(page).toHaveURL(/escenario=ec_loja(&|$)/)
    })

    test('Observatorio · mapa: la provincia aparece bajo el puntero', async ({ page }) => {
      await page.goto('/explorar/observatorio?escenario=ec_la_segua')
      const lienzo = page.getByTestId('mapa')
      await expect(lienzo.locator('canvas.maplibregl-canvas')).toBeVisible({ timeout: 30_000 })
      const caja = (await lienzo.boundingBox())!
      await expect(async () => {
        await page.mouse.move(caja.x + caja.width * 0.5, caja.y + caja.height * 0.4)
        await page.mouse.move(caja.x + caja.width * 0.5 + 3, caja.y + caja.height * 0.4 + 3)
        await expect(page.locator('.mapa__provincia')).toContainText('Manabí', { timeout: 1000 })
      }).toPass({ timeout: 20_000 })
    })

    test('Observatorio · mapa: un clic fuera de Ecuador avisa y no simula', async ({ page }) => {
      const posts: string[] = []
      page.on('request', (r) => { if (r.method() === 'POST' && r.url().includes('/api/simulacion/escenario')) posts.push(r.url()) })
      await page.goto('/explorar/observatorio')
      // En móvil la acción vive en el menú «Más acciones»; en escritorio, en la barra del mapa.
      const menu = page.getByRole('button', { name: 'Más acciones' })
      const todo = page.getByRole('button', { name: 'Ver todo Ecuador' }).or(menu)
      await expect(todo).toBeVisible({ timeout: 30_000 })
      if (await menu.isVisible()) {
        await menu.click()
        await page.getByRole('menuitem', { name: 'Ver todo Ecuador' }).click()
        await menu.click()
        await expect(page.getByRole('menuitem', { name: 'Ver el escenario' })).toBeVisible()
        await page.keyboard.press('Escape')
      } else {
        await todo.click()
        await expect(page.getByRole('button', { name: 'Ver el escenario' })).toBeVisible()
      }
      const lienzo = page.getByTestId('mapa')
      await expect(lienzo.locator('canvas.maplibregl-canvas')).toBeVisible()
      // Borde oeste del mapa con todo Ecuador a la vista (el encuadre deja 16 px de margen al oeste de
      // -92,2°): océano, fuera del país. Playwright desplaza el mapa hasta dejar visible ese punto.
      await expect(async () => {
        await lienzo.click({ position: { x: 6, y: 200 } })
        await expect(page.getByRole('alert').filter({ hasText: 'fuera de Ecuador' })).toBeVisible({ timeout: 1500 })
      }).toPass({ timeout: 20_000 })
      expect(posts).toHaveLength(0)
    })

    if (ancho < 700) {
      test('móvil: barra inferior visible, riel oculto y sin desborde horizontal', async ({ page }) => {
        for (const ruta of ['/', '/explorar/observatorio']) {
          await page.goto(ruta)
          const nav = page.getByRole('navigation', { name: 'Principal' })
          await expect(nav).toBeVisible()
          const caja = (await nav.boundingBox())!
          expect(caja.y + caja.height).toBeGreaterThan(alto - 80) // pegada abajo
          expect(caja.width).toBeGreaterThan(ancho * 0.9)
          expect(await page.locator('.riel__marca').isVisible()).toBe(false)
          expect(await hayDesborde(page)).toBe(false)
        }
      })
    } else {
      test('escritorio: riel lateral visible y sin desborde horizontal', async ({ page }) => {
        await page.goto('/')
        const caja = (await page.getByRole('navigation', { name: 'Principal' }).boundingBox())!
        expect(caja.width).toBeLessThan(240)
        expect(await hayDesborde(page)).toBe(false)
      })
    }
  })
}

import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

// Reglas axe con infracciones serious/critical conocidas (línea base en INFORME.md).
// Las Tareas 21–25 las van quitando; la Tarea 25 deja la lista vacía.
const PENDIENTES: string[] = []

const RUTAS = ['/', '/observatorio', '/simulador', '/laboratorio', '/recorrido', '/fundamentos']
const IDIOMAS = ['es', 'en', 'qu']
const ANCHOS = [
  { ancho: 1440, alto: 900 },
  { ancho: 390, alto: 844 },
]

for (const ruta of RUTAS) {
  for (const idioma of IDIOMAS) {
    for (const { ancho, alto } of ANCHOS) {
      test(`axe ${ruta} · ${idioma} · ${ancho}`, async ({ page }) => {
        test.setTimeout(60_000)
        await page.setViewportSize({ width: ancho, height: alto })
        await page.goto(`${ruta}?idioma=${idioma}`)
        await page.waitForLoadState('networkidle')
        await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 20_000 })
        const { violations } = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze()
        const graves = violations.filter(
          (v) => (v.impact === 'serious' || v.impact === 'critical') && !PENDIENTES.includes(v.id),
        )
        // Orientación (Tarea 21): estas reglas son moderate, pero aquí no se toleran en ningún caso.
        const orientacion = violations.filter((v) => ['bypass', 'document-title', 'page-has-heading-one', 'heading-order', 'landmark-one-main'].includes(v.id))
        expect(orientacion.map((v) => v.id)).toEqual([])
        if (process.env.AXE_VOLCAR) {
          for (const v of graves) console.log(`AXE|${v.id}|${v.impact}|${ruta}|${idioma}|${ancho}|${v.nodes.length}`)
        }
        expect(graves.map((v) => `${v.id} (${v.impact}, ${v.nodes.length} nodos)`)).toEqual([])
      })
    }
  }
}

test('teclado a 390 px: el foco no queda tapado y los objetivos miden ≥ 24 px', async ({ page }) => {
  test.setTimeout(90_000)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/observatorio?idioma=es')
  await page.waitForLoadState('networkidle')
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 20_000 })

  // Objetivos: todo botón, enlace o campo visible mide al menos 24 × 24 px (los enlaces dentro de texto están exentos).
  const pequenos = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>('button, a[href], input:not([type="hidden"]), select'))
      .filter((el) => {
        const r = el.getBoundingClientRect()
        const e = getComputedStyle(el)
        return r.width > 0 && r.height > 0 && e.visibility !== 'hidden' && !el.classList.contains('saltar') && !el.closest('.solo-lectores')
          && !(el.tagName === 'A' && e.display === 'inline')
      })
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.width < 24 || r.height < 24)
      .map(({ el, r }) => `${el.tagName}.${el.className} ${Math.round(r.width)}x${Math.round(r.height)}`),
  )
  expect(pequenos).toEqual([])

  // Foco: 40 Tab; cada elemento enfocado queda dentro del viewport y no bajo la banda ni la barra inferior.
  const problemas: string[] = []
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab')
    const info = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null
      if (!el || el === document.body) return null
      const r = el.getBoundingClientRect()
      const banda = document.querySelector('.banda-demo')?.getBoundingClientRect().bottom ?? 0
      const barra = document.querySelector('.riel')?.getBoundingClientRect().top ?? window.innerHeight
      return {
        nombre: `${el.tagName}.${el.className}`, top: r.top, bottom: r.bottom, left: r.left, right: r.right,
        ancho: window.innerWidth, banda, barra, enRiel: !!el.closest('.riel'), enBanda: !!el.closest('.banda-demo') || el.classList.contains('saltar'), // el enlace de salto flota por encima de la banda
        ocupa: r.width > 0 && r.height > 0,
      }
    })
    if (!info || !info.ocupa) continue
    if (info.left < 0 || info.right > info.ancho) problemas.push(`${info.nombre} fuera en horizontal`)
    if (!info.enBanda && !info.enRiel && info.top < info.banda - 1) problemas.push(`${info.nombre} bajo la banda (${info.top} < ${info.banda})`)
    if (!info.enRiel && info.bottom > info.barra + 1) problemas.push(`${info.nombre} bajo la barra inferior (${info.bottom} > ${info.barra})`)
  }
  expect(problemas).toEqual([])
})

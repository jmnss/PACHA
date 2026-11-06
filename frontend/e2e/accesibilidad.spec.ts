import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

// Reglas axe con infracciones serious/critical conocidas (línea base en INFORME.md).
// Las Tareas 21–25 las van quitando; la Tarea 25 deja la lista vacía.
const PENDIENTES: string[] = ['label-content-name-mismatch']

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
        if (process.env.AXE_VOLCAR) {
          for (const v of graves) console.log(`AXE|${v.id}|${v.impact}|${ruta}|${idioma}|${ancho}|${v.nodes.length}`)
        }
        expect(graves.map((v) => `${v.id} (${v.impact}, ${v.nodes.length} nodos)`)).toEqual([])
      })
    }
  }
}

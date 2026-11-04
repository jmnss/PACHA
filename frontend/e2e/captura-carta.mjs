// Captura manual CON red (no forma parte de la suite): node e2e/captura-carta.mjs <salida>
import { chromium } from '@playwright/test'
const salida = process.argv[2]
const nav = await chromium.launch({ executablePath: process.env.CHROME_PATH, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
for (const [ancho, alto] of [[1440, 900], [390, 844]]) {
  for (const [ruta, nombre] of [['/observatorio?vista=mapa', 'mapa']]) {
    for (const [base, etiq] of [['oscuro', 'Oscuro'], ['satelite', 'Satélite'], ['relieve', 'Relieve']]) {
      const p = await nav.newPage({ viewport: { width: ancho, height: alto } })
      await p.goto('http://localhost:8000' + ruta, { waitUntil: 'networkidle' })
      await p.getByRole('tab', { name: etiq, exact: true }).first().click().catch(() => {})
      await p.waitForTimeout(6000)
      await p.screenshot({ path: `${salida}/${nombre}-${ancho}-${base}.png`, fullPage: true })
      if (nombre === 'mapa') {
        await p.getByRole('button', { name: 'Ver todo Ecuador' }).click()
        await p.waitForTimeout(6000)
        await p.screenshot({ path: `${salida}/pais-${ancho}-${base}.png`, fullPage: true })
      }
      await p.close()
    }
  }
}
await nav.close()

import { expect, test } from '@playwright/test'
import { buildSync } from 'esbuild'

// El preview sirve dist/, sin código fuente: se empaqueta png.ts (la unidad bajo prueba) en un script.
const { outputFiles } = buildSync({ entryPoints: ['src/exportar/png.ts'], bundle: true, format: 'iife', globalName: 'Exp', write: false })

// Navegador real: la franja de origen debe quedar dibujada en los píxeles del PNG exportado.
test('PNG sintético: la franja inferior de 24 px existe y difiere de la imagen', async ({ page }) => {
  await page.goto('/')
  await page.addScriptTag({ content: outputFiles[0].text })
  const r = await page.evaluate(async () => {
    const { aPng } = (window as unknown as { Exp: typeof import('../src/exportar/png') }).Exp
    const c = document.createElement('canvas'); c.width = 200; c.height = 80
    const g = c.getContext('2d')!
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 200, 80)
    const origen = { tipo: 'sintetico', fuente: 'demo', fecha_generacion: '2026-11-05T00:00:00Z' }
    const blob = await aPng(c, origen as never)
    const bmp = await createImageBitmap(blob)
    const o = document.createElement('canvas'); o.width = bmp.width; o.height = bmp.height
    const og = o.getContext('2d')!; og.drawImage(bmp, 0, 0)
    const px = (x: number, y: number) => Array.from(og.getImageData(x, y, 1, 1).data)
    return { ancho: bmp.width, alto: bmp.height, imagen: px(190, 40), franja: px(199, 90) }
  })
  expect(r.ancho).toBe(200)
  expect(r.alto).toBe(104)
  expect(r.imagen).toEqual([255, 255, 255, 255])
  expect(r.franja).not.toEqual(r.imagen)
})

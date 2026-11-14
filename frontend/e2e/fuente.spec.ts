import { expect, test } from '@playwright/test'

// jsdom no mide texto: se comprueba en el navegador real que, con Public Sans y tabular-nums,
// todos los dígitos ocupan el mismo ancho (docs/diseno.md §5).
test('Public Sans con tabular-nums: «111111» y «888888» miden lo mismo', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => document.fonts.load('400 20px "Public Sans"', '0123456789'))
  const anchos = await page.evaluate(() => {
    const medir = (texto: string, tabular: boolean) => {
      const el = document.createElement('span')
      el.textContent = texto
      el.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;font:400 20px "Public Sans";font-variant-numeric:${tabular ? 'tabular-nums' : 'normal'}`
      document.body.appendChild(el)
      const w = el.getBoundingClientRect().width
      el.remove()
      return w
    }
    return {
      fuenteCargada: document.fonts.check('400 20px "Public Sans"'),
      unos: medir('111111', true),
      ochos: medir('888888', true),
      unosProp: medir('111111', false),
      ochosProp: medir('888888', false),
    }
  })
  console.log(JSON.stringify(anchos))
  expect(anchos.fuenteCargada).toBe(true)
  expect(Math.abs(anchos.unos - anchos.ochos)).toBeLessThanOrEqual(0.5)
})

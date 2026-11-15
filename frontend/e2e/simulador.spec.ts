import { expect, test } from '@playwright/test'

// Requiere `npm run build` previo (servidor.py sirve frontend/dist). Relieve sintético: sin red.
const ANCHOS = [{ nombre: 'escritorio 1440', ancho: 1440, alto: 900 }, { nombre: 'móvil 390', ancho: 390, alto: 844 }]
const RUTA = '/simular?h=incendio&lat=-0.03&lon=-78.52&ext=20&dem=0'

for (const { nombre, ancho, alto } of ANCHOS) {
  test.describe(`simulador · ${nombre}`, () => {
    test.use({ viewport: { width: ancho, height: alto } })

    test('tres pasos: fenómeno, mapa y «Desatar»; el resultado llega sin desborde', async ({ page }) => {
      await page.goto('/simular')
      await expect(page.getByRole('region', { name: 'Aviso de datos de demostración' })).toBeVisible()
      await page.getByRole('button', { name: /Incendio/ }).click()
      await expect(page.getByRole('navigation', { name: 'Pasos del simulador' })).toContainText('Cerro Casitagua')
      await page.goto(RUTA)
      await expect(page.getByRole('group', { name: /Tablero del simulador/ })).toBeVisible({ timeout: 60_000 })
      await expect(page.getByRole('heading', { name: 'Resultado' })).toHaveCount(0)
      const desatar = ancho < 700 ? page.locator('.sim__barra').getByRole('button', { name: 'Desatar' }) : page.getByRole('button', { name: 'Desatar' })
      await desatar.click()
      await expect(page.getByText(/canchas de fútbol/).first()).toBeVisible({ timeout: 90_000 })
      await expect(page.getByText('ejemplo de demostración').first()).toBeVisible()
      await expect(page.getByRole('link', { name: 'Compáralo con lo que vio el radar' })).toBeVisible()
      await expect(page).toHaveURL(/i=64&j=64/)
      expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false)
    })

    test('un enlace manipulado cae a los valores por defecto sin romper la pantalla', async ({ page }) => {
      await page.goto('/simular?lat=999&ext=7&h=meteorito&i=-4&p=__proto__:1')
      await expect(page.getByRole('button', { name: /Incendio/ })).toBeVisible({ timeout: 60_000 })
      await expect(page.getByRole('alert')).toHaveCount(0)
    })
  })
}

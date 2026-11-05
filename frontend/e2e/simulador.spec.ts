import { expect, test } from '@playwright/test'

// Requiere `npm run build` previo (servidor.py sirve frontend/dist). Relieve sintético: sin red.
const ANCHOS = [{ nombre: 'escritorio 1440', ancho: 1440, alto: 900 }, { nombre: 'móvil 390', ancho: 390, alto: 844 }]
const RUTA = '/simulador?lat=-4.05&lon=-79.25&dem=0&ext=60'

for (const { nombre, ancho, alto } of ANCHOS) {
  test.describe(`simulador · ${nombre}`, () => {
    test.use({ viewport: { width: ancho, height: alto } })

    test('desatar un incendio muestra el gemelo del radar, la espera y la banda de demostración', async ({ page, context }) => {
      await context.grantPermissions(['clipboard-read', 'clipboard-write'])
      await page.goto(RUTA)
      await expect(page.getByRole('region', { name: 'Aviso de datos de demostración' })).toBeVisible()
      const tablero = page.getByRole('group', { name: /Tablero del simulador/ })
      await expect(tablero).toBeVisible({ timeout: 60_000 })
      // Enter con el teclado desde el centro: no depende del tamaño de la ventana.
      await tablero.focus()
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('Enter')
      await expect(page).toHaveURL(/i=64&j=64/)
      await expect(page.getByRole('heading', { name: /Incendio/ }).first()).toBeVisible({ timeout: 90_000 })
      await expect(page.getByText(/Lo que vería un radar como NISAR/)).toBeVisible()
      await expect(page.getByText(/pendiente de confirmar con la documentación oficial/).first()).toBeVisible()
      await expect(page.getByRole('button', { name: 'Reproducir' }).or(page.getByRole('button', { name: 'Pausa' }))).toBeVisible()

      await page.getByRole('button', { name: 'Copiar enlace' }).click()
      await expect(page.getByText('Enlace copiado.')).toBeVisible()
      const enlace = await page.evaluate(() => navigator.clipboard.readText())
      expect(enlace).toContain('/simulador?')
      expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false)

      // Quien abre el enlace recrea el mismo evento.
      await page.goto(enlace.replace(/^https?:\/\/[^/]+/, ''))
      await expect(page.getByRole('heading', { name: /Incendio/ }).first()).toBeVisible({ timeout: 90_000 })
    })

    test('un enlace manipulado cae a los valores por defecto sin romper la pantalla', async ({ page }) => {
      await page.goto('/simulador?lat=999&ext=7&h=meteorito&i=-4&p=__proto__:1')
      await expect(page.getByRole('group', { name: /Tablero del simulador/ })).toBeVisible({ timeout: 60_000 })
      await expect(page.getByRole('alert')).toHaveCount(0)
    })
  })
}

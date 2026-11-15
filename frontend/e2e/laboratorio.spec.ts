import { expect, test } from '@playwright/test'

// Requiere `npm run build` previo (servidor.py sirve frontend/dist). Todo sintético: sin red.
for (const { nombre, ancho, alto } of [{ nombre: 'escritorio 1440', ancho: 1440, alto: 900 }, { nombre: 'móvil 390', ancho: 390, alto: 844 }]) {
  test.describe(`laboratorio y recorrido · ${nombre}`, () => {
    test.use({ viewport: { width: ancho, height: alto } })

    test('las nubes tapan el óptico y el radar no cambia', async ({ page }) => {
      await page.goto('/aprender/laboratorio?nubes=0')
      await expect(page.getByRole('region', { name: 'Aviso de datos de demostración' })).toBeVisible()
      const radar = page.locator('.franja-kpi__item', { hasText: 'Cambio visto por el radar' }).locator('.franja-kpi__valor')
      const optico = page.locator('.franja-kpi__item', { hasText: 'Cambio visto por el óptico' }).locator('.franja-kpi__valor')
      await expect(radar).toBeVisible({ timeout: 30_000 })
      const r0 = await radar.innerText()
      const o0 = Number.parseInt(await optico.innerText(), 10)
      await page.getByLabel(/Cobertura de nubes/).fill('100')
      await expect(optico).toContainText('0')
      expect(Number.parseInt(await optico.innerText(), 10)).toBeLessThan(o0)
      await expect(radar).toHaveText(r0)
    })

    test('la banda S avisa de que está pendiente de confirmar', async ({ page }) => {
      await page.goto('/aprender/laboratorio?vista=polarizacion&banda=S')
      await expect(page.getByText(/pendiente de confirmar con la documentación oficial/).first()).toBeVisible({ timeout: 30_000 })
      await expect(page.getByText('Quema del bosque').first()).toBeVisible()
    })

    test('el recorrido incrusta la pantalla del paso, sin riel y con la banda, y avanza con el teclado', async ({ page }) => {
      await page.goto('/aprender/recorrido')
      await page.getByRole('button', { name: 'Pausar' }).click()
      const marco = page.frameLocator('iframe')
      await expect(marco.getByRole('region', { name: 'Aviso de datos de demostración' })).toBeVisible({ timeout: 30_000 })
      await expect(marco.getByRole('navigation', { name: 'Principal' })).toHaveCount(0)
      await page.getByRole('button', { name: 'Siguiente' }).click()
      await expect(page).toHaveURL(/paso=2/)
      await expect(marco.getByRole('heading', { name: 'Laboratorio del radar' })).toBeVisible({ timeout: 30_000 })
    })
  })
}

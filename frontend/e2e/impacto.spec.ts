import { expect, test } from '@playwright/test'

// Requiere `npm run build` previo. Todo sintético: sin red.
for (const { nombre, ancho, alto } of [{ nombre: 'escritorio 1440', ancho: 1440, alto: 900 }, { nombre: 'móvil 390', ancho: 390, alto: 844 }]) {
  test.describe(`impacto · ${nombre}`, () => {
    test.fixme(true, 'La vista Impacto se ocultó en el Observatorio con datos reales del equipo (dependía del modelo de demostración).')
    test.use({ viewport: { width: ancho, height: alto } })

    test('la inundación muestra hectáreas, lectura como ejemplo y un informe PNG descargable', async ({ page }) => {
      await page.goto('/explorar/observatorio?escenario=ec_la_segua&vista=impacto')
      await expect(page.getByText('Superficie inundada al final')).toBeVisible({ timeout: 60_000 })
      await expect(page.getByText(/En este escenario de demostración, el radar marca unas/)).toBeVisible()
      await expect(page.getByText(/Si esto fuera un evento real/)).toBeVisible()
      const [descarga] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Descargar informe/ }).click()])
      expect(descarga.suggestedFilename()).toMatch(/^impacto_ec_la_segua_.*\.png$/)
    })

    test('el incendio se resume en superficie quemada', async ({ page }) => {
      await page.goto('/explorar/observatorio?escenario=ec_loja&vista=impacto')
      await expect(page.getByText('Superficie quemada detectada')).toBeVisible({ timeout: 60_000 })
    })

    test('un escenario sin historia no ofrece la pestaña Impacto', async ({ page }) => {
      await page.goto('/explorar/observatorio?escenario=ec_antisana&vista=impacto')
      await expect(page.getByRole('tab', { name: 'Serie' })).toBeVisible({ timeout: 60_000 })
      await expect(page.getByRole('tab', { name: 'Impacto' })).toHaveCount(0)
    })
  })
}

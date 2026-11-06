import { expect, test } from '@playwright/test'

const OBS = '/observatorio?escenario=ec_la_segua'

async function esperarCarga(page: import('@playwright/test').Page) {
  await page.waitForLoadState('networkidle')
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 20_000 })
}

test.describe('idioma', () => {
  test('cambiar de idioma con datos cargados no repite peticiones y persiste', async ({ page }) => {
    test.setTimeout(60_000)
    await page.goto(`${OBS}&idioma=es`)
    await esperarCarga(page)
    const h1Es = await page.locator('h1').first().innerText()
    const peticiones: string[] = []
    page.on('request', (r) => { if (r.url().includes('/api/')) peticiones.push(r.url()) })

    await page.getByRole('button', { name: /Idioma/ }).click()
    await page.locator('.selector-idioma__nombre', { hasText: 'English' }).click()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.locator('h1').first()).not.toHaveText(h1Es)
    await page.waitForLoadState('networkidle')
    expect(peticiones).toEqual([])

    await page.reload()
    await esperarCarga(page)
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    expect(await page.evaluate(() => document.documentElement.lang)).toBe('en')
  })

  test('el clic con ratón sobre la etiqueta de una opción cierra el panel y cambia el idioma', async ({ page }) => {
    await page.goto(`${OBS}&idioma=es`)
    await esperarCarga(page)
    const boton = page.getByRole('button', { name: /Idioma/ })
    await boton.click()
    await expect(boton).toHaveAttribute('aria-expanded', 'true')
    await page.locator('.selector-idioma__nombre', { hasText: 'English' }).click()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.locator('.selector-idioma__panel')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Language/ })).toHaveAttribute('aria-expanded', 'false')
  })

  test('en kichwa se ven el aviso de revisión y la banda de demostración', async ({ page }) => {
    await page.goto(`${OBS}&idioma=qu`)
    await esperarCarga(page)
    await expect(page.locator('html')).toHaveAttribute('lang', 'qu-EC')
    await expect(page.locator('.aviso-traduccion')).toBeVisible()
    await expect(page.locator('.banda-demo__fila')).toBeVisible()
  })

  test('el recorrido incrustado sigue al idioma de la página sin peticiones nuevas', async ({ page }) => {
    test.setTimeout(60_000)
    await page.goto('/recorrido?idioma=qu')
    await esperarCarga(page)
    const marco = page.frameLocator('iframe.recorrido__marco')
    await expect(marco.locator('html')).toHaveAttribute('lang', 'qu-EC', { timeout: 15_000 })
    await page.waitForLoadState('networkidle')
    const peticiones: string[] = []
    page.on('request', (r) => { if (r.url().includes('/api/')) peticiones.push(r.url()) })

    await page.getByRole('button', { name: /Shimi/ }).click()
    await page.locator('.selector-idioma__nombre', { hasText: 'English' }).click()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(marco.locator('html')).toHaveAttribute('lang', 'en', { timeout: 10_000 })
    await page.waitForLoadState('networkidle')
    expect(peticiones).toEqual([])
  })

  test('cambiar de idioma con un evento del simulador reproduciéndose no repite peticiones ni pierde el estado (criterio 2)', async ({ page }) => {
    test.setTimeout(150_000)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/simulador?lat=-4.05&lon=-79.25&dem=0&ext=60&idioma=es')
    const tablero = page.getByRole('group', { name: /Tablero del simulador/ })
    await expect(tablero).toBeVisible({ timeout: 60_000 })
    await tablero.focus()
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/i=64&j=64/)
    await expect(page.getByRole('heading', { name: /Incendio forestal/ }).first()).toBeVisible({ timeout: 90_000 })
    await page.waitForLoadState('networkidle')
    // Reproducción en curso.
    const reproducir = page.getByRole('button', { name: 'Reproducir' })
    if (await reproducir.isVisible()) await reproducir.click()
    await expect(page.getByRole('button', { name: 'Pausa' })).toBeVisible()
    const url = page.url()

    const peticiones: string[] = []
    page.on('request', (r) => { if (r.url().includes('/api/')) peticiones.push(r.url()) })
    await page.getByRole('button', { name: /Idioma/ }).click()
    await page.locator('.selector-idioma__nombre', { hasText: 'English' }).click()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.getByRole('heading', { name: /Forest fire/ }).first()).toBeVisible()
    // La reproducción sigue (el botón ofrece pausar) y la URL del evento no cambia.
    await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible()
    expect(page.url()).toBe(url)
    await page.waitForTimeout(1500)
    expect(peticiones).toEqual([])
  })
})

import { expect, test } from '@playwright/test'

// Rutas viejas → nuevas (T2): conservan la query y el hash. Sirve igual en local y en Pages (base de playwright.config).
const CASOS: [string, string][] = [
  ['observatorio?escenario=ec_x&vista=serie#r', 'explorar/observatorio?escenario=ec_x&vista=serie#r'],
  ['simulador?lat=-4.05&lon=-79.25&dem=0&ext=60', 'simular?lat=-4.05&lon=-79.25&dem=0&ext=60'],
  ['laboratorio?vista=polarizacion&banda=S', 'aprender/laboratorio?vista=polarizacion&banda=S'],
  ['recorrido?paso=2', 'aprender/recorrido?paso=2'],
  ['fundamentos?x=1', 'aprender/fundamentos?x=1'],
  ['?historia=incendio', 'explorar/historias?historia=incendio'],
  ['explorar?x=1', 'explorar/historias?x=1'],
  ['aprender?x=1', 'aprender/fundamentos?x=1'],
]

for (const [vieja, nueva] of CASOS) {
  test(`${vieja} llega a ${nueva}`, async ({ page }) => {
    await page.goto(vieja)
    await expect(page).toHaveURL((u) => u.href.endsWith(`/${nueva}`))
    await expect(page.getByRole('navigation', { name: 'Principal' })).toBeVisible()
  })
}

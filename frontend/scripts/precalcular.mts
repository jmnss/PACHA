// Graba las respuestas de la API recorriendo la app compilada (modo `servidor`) para servirlas como archivos
// estáticos en Pages. Uso (desde frontend/): node scripts/precalcular.mts --origen http://127.0.0.1:8000 --salida .precalculado
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { chromium, type Page } from '@playwright/test'
import { claveDePeticion, hashClave } from '../src/motor/clave.ts'

function opcion(nombre: string, porDefecto: string): string {
  const i = process.argv.indexOf(nombre)
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : porDefecto
}
const origen = opcion('--origen', 'http://127.0.0.1:8000')
const salida = resolve(opcion('--salida', '.precalculado'))
const MINIMO = 40

rmSync(salida, { recursive: true, force: true })
mkdirSync(salida, { recursive: true })

const indice: Record<string, string> = {}

const navegador = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined })
const contexto = await navegador.newContext({ locale: 'es-EC', reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } })
await contexto.addInitScript(() => localStorage.setItem('nisar.idioma', 'es'))

const grabaciones: Promise<void>[] = []
contexto.on('requestfinished', (peticion) => {
  const url = new URL(peticion.url())
  if (!url.pathname.startsWith('/api/')) return
  grabaciones.push((async () => {
    const respuesta = await peticion.response()
    if (!respuesta || respuesta.status() !== 200) return
    const post = peticion.postData()
    const clave = claveDePeticion(peticion.method(), url.pathname + url.search, post ? JSON.parse(post) : undefined)
    const hash = await hashClave(clave)
    if (hash in indice) return
    const cuerpo = await respuesta.text()
    writeFileSync(join(salida, `${hash}.json`), JSON.stringify({ estado: 200, cuerpo }))
    indice[hash] = clave
  })().catch((e) => console.warn('No se pudo grabar', peticion.url(), e instanceof Error ? e.message : e)))
})

const page = await contexto.newPage()
async function visitar(ruta: string, despues?: (p: Page) => Promise<void>): Promise<void> {
  await page.goto(origen + ruta, { waitUntil: 'networkidle', timeout: 120_000 })
  if (despues) await despues(page)
  await page.waitForLoadState('networkidle', { timeout: 120_000 })
  await Promise.all(grabaciones)
  console.log('ok', ruta, Object.keys(indice).length)
}

const escenarios: { id: string; historia: string | null }[] = await (await fetch(`${origen}/api/escenarios`)).json()

await visitar('/')
await visitar('/?historia=incendio')
for (const e of escenarios) {
  for (const vista of ['mapa', 'comparar', 'serie']) {
    await visitar(`/observatorio?escenario=${e.id}&vista=${vista}`, vista !== 'mapa' ? undefined : async (p) => {
      const boton = p.getByRole('button', { name: 'Reproducir' })
      if (await boton.count() === 0) return
      await boton.click()
      await p.getByRole('button', { name: 'Reproducir' }).waitFor({ timeout: 60_000 })
    })
  }
  if (e.historia !== null) await visitar(`/observatorio?escenario=${e.id}&vista=impacto`)
}
for (let n = 0; n <= 100; n += 10) await visitar(`/laboratorio?nubes=${n}`)
for (const banda of ['L', 'S']) {
  for (const pol of ['HH', 'HV', 'VV']) await visitar(`/laboratorio?vista=polarizacion&banda=${banda}&pol=${pol}`)
}
await visitar('/fundamentos')
await visitar('/simulador')
for (let paso = 1; paso <= 6; paso++) await visitar(`/recorrido?paso=${paso}`)

await Promise.all(grabaciones)
writeFileSync(join(salida, 'indice.json'), JSON.stringify(indice))
await navegador.close()

const total = Object.keys(indice).length
console.log(`Precálculo: ${total} respuestas en ${salida}`)
if (total < MINIMO) {
  console.error(`Se esperaban al menos ${MINIMO} entradas`)
  process.exit(1)
}

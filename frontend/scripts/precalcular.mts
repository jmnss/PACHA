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
const capas = (id: string) => Object.values(indice).filter((c) => c.startsWith(`GET /api/escenarios/${id}/capa?`)).length
async function visitar(ruta: string, despues?: (p: Page) => Promise<void>): Promise<void> {
  await page.goto(origen + ruta, { waitUntil: 'networkidle', timeout: 120_000 })
  if (despues) await despues(page)
  await page.waitForLoadState('networkidle', { timeout: 120_000 })
  await Promise.all(grabaciones)
  console.log('ok', ruta, Object.keys(indice).length)
}

const escenarios: { id: string; historia: string | null }[] = await (await fetch(`${origen}/api/escenarios`)).json()
const pasadas: Record<string, number> = {}
for (const e of escenarios) {
  pasadas[e.id] = ((await (await fetch(`${origen}/api/escenarios/${e.id}`)).json()) as { adquisiciones: unknown[] }).adquisiciones.length
}

// Historias: cada paso de cada sitio (pide /resumen, /comparacion/embalses y solo las capas que cada fecha tiene).
for (const q of ['historia=embalses', 'historia=embalses&sitio=daule-peripa', 'historia=incendio']) {
  for (let paso = 1; paso <= 4; paso++) {
    await visitar(`/explorar/historias?${q}&paso=${paso}`, async (p) => {
      // HH/HV y, en el incendio, la capa ΔRFDI del paso 4.
      for (const nombre of ['HH', 'HV', 'ΔRFDI']) {
        const r = p.getByRole('radio', { name: new RegExp(`^${nombre}`) })
        if (await r.count() > 0) { await r.first().click(); await p.waitForLoadState('networkidle', { timeout: 60_000 }) }
      }
    })
  }
}
for (const e of escenarios) {
  // La Serie solo existe con tres fechas o más; «Impacto» ya no se muestra con los datos del equipo.
  for (const vista of pasadas[e.id] >= 3 ? ['mapa', 'comparar', 'serie'] : ['mapa', 'comparar']) {
    // El reproductor se recorre otra vez (hasta dos) si falta alguna capa: en una máquina lenta un clic puede
    // saltarse una pasada. Lo ya grabado no se repite.
    const intentos = vista === 'mapa' ? 3 : 1
    for (let intento = 0; intento < intentos && (intento === 0 || capas(e.id) < pasadas[e.id]); intento++) {
      await visitar(`/explorar/observatorio?escenario=${e.id}&vista=${vista}`, vista !== 'mapa' ? undefined : async (p) => {
        // Con `reducedMotion: 'reduce'` cada pulsación de «Reproducir» avanza una pasada: se pulsa una vez por pasada
        // para que se pida (y se grabe) la capa de cada fotograma de la línea de tiempo.
        const boton = p.getByRole('button', { name: 'Reproducir' })
        if (await boton.count() === 0) return
        for (let k = 0; k <= pasadas[e.id]; k++) {
          // `networkidle` vuelve en el acto si la página ya estaba quieta: antes del siguiente clic se espera la
          // respuesta de la capa (o 5 s, si esa pasada ya estaba en caché).
          const capa = p.waitForResponse((r) => r.url().includes(`/api/escenarios/${e.id}/capa?`), { timeout: 5_000 }).catch(() => null)
          await boton.click()
          await capa
          await p.waitForLoadState('networkidle', { timeout: 60_000 })
        }
      })
      if (intento > 0) console.log(`reintento ${intento} de ${e.id}: ${capas(e.id)} de ${pasadas[e.id]} capas`)
    }
  }
}
for (let n = 0; n <= 100; n += 10) await visitar(`/aprender/laboratorio?nubes=${n}`)
for (const banda of ['L', 'S']) {
  for (const pol of ['HH', 'HV', 'VV']) await visitar(`/aprender/laboratorio?vista=polarizacion&banda=${banda}&pol=${pol}`)
}
await visitar('/aprender/fundamentos')
await visitar('/simular')
for (let paso = 1; paso <= 6; paso++) await visitar(`/aprender/recorrido?paso=${paso}`)

await Promise.all(grabaciones)
writeFileSync(join(salida, 'indice.json'), JSON.stringify(indice))
await navegador.close()

// Cada escenario debe tener la capa de todas sus pasadas (el reproductor del mapa no puede depender del motor).
const faltan = escenarios.filter((e) => capas(e.id) < pasadas[e.id])
for (const e of faltan) console.error(`Faltan capas de ${e.id}: ${capas(e.id)} de ${pasadas[e.id]}`)

const total = Object.keys(indice).length
console.log(`Precálculo: ${total} respuestas en ${salida}`)
if (faltan.length > 0) process.exit(1)
if (total < MINIMO) {
  console.error(`Se esperaban al menos ${MINIMO} entradas`)
  process.exit(1)
}

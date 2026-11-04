import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HISTORIAS } from './contenido'
import { PREFIJO_HIPOTESIS, type Parrafo } from './contenido/tipos'
import Historias from './Historias'

const origen = { tipo: 'sintetico', fuente: 'Generador de demostración', generador: 'datos/generador.py', version: '1', semilla: 7, fecha_generacion: '2026-11-04T00:00:00Z' }
const BBOX = [-80.24, -0.74, -80.16, -0.66]
const rejilla = { filas: 2, columnas: 2, vmin: -20, vmax: -2, bbox: BBOX, datos_b64: btoa(String.fromCharCode(1, 80, 160, 255)) }
const fechas = ['2026-04-12', '2026-04-24', '2026-05-06', '2026-05-18']
const escenario = (id: string, historia: string | null) => ({
  id, nombre: `Escenario ${id}`, tipo_cambio: 'x', historia, region: 'Costa', bbox: BBOX, resolucion_m: 100,
  polarizaciones: ['HH', 'HV'], variables: ['sigma0'], origen,
  capacidades: { simulacion: true, modelo_continuo: true, verdad_terreno: true },
  adquisiciones: fechas.map((f) => ({ id: f, instante: `${f}T00:00:00Z`, direccion_orbital: 'Ascendente', polarizaciones: ['HH', 'HV'] })),
})
const ESCENARIOS = [escenario('ec_otro', null), escenario('ec_agua', 'inundacion'), escenario('ec_fuego', 'incendio')]
const capa = (pol: string) => ({ escenario_id: 'x', adquisicion_id: null, instante: null, polarizacion: pol, origen, rejilla, variable: 'sigma0', paleta: 'gris', unidad: 'dB', leyenda: null })
let llamadas: { url: string; cuerpo: any }[] // eslint-disable-line @typescript-eslint/no-explicit-any
const json = (x: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(x), { status }))

beforeEach(() => {
  llamadas = []
  vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => {
    llamadas.push({ url, cuerpo: init?.body ? JSON.parse(String(init.body)) : undefined })
    if (url === '/api/salud') return json({ estado: 'ok', hay_sinteticos: true, origen_tipo: 'sintetico', proveedor: 'demo', version: '1' })
    if (url === '/api/escenarios') return json(ESCENARIOS)
    if (url.startsWith('/api/contexto')) return json(null)
    if (url.endsWith('/cambio')) {
      const pol = JSON.parse(String(init?.body)).polarizacion
      return json({
        antes: capa(pol), despues: capa(pol), cambio: capa(pol), capas_extra: [], clasificacion: null, tablas: [], vectores: null, origen,
        notas: ['Nota del modelo de demostración.'], metricas: [],
        series: [{ titulo: 'Superficie inundada', unidad: 'km²', puntos: [[fechas[0], 20, 'Detectada'], [fechas[3], 5, 'Detectada']] }],
      })
    }
    return json({ mensaje: 'no previsto' }, 404)
  }))
})
afterEach(() => { vi.unstubAllGlobals() })

function montar(ruta = '/') {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={cliente}><MemoryRouter initialEntries={[ruta]}><Historias /></MemoryRouter></QueryClientProvider>,
  )
}

const aTexto = (p: Parrafo) => p.map((s) => (typeof s === 'string' ? s : s.termino)).join('')
const SEGMENTOS_TEXTO = (h: (typeof HISTORIAS)[number]) => [
  ...h.queCambia.parrafos, ...h.queVeElRadar.parrafos, ...h.comparador.introduccion, h.comparador.porQue, h.comparador.otra,
  ...h.hipotesis.parrafos, ...h.aplicaciones.parrafos,
]

describe('Historias · contenido escrito a mano', () => {
  it('hay dos historias y la principal es la inundación', () => {
    expect(HISTORIAS.map((h) => h.clave)).toEqual(['inundacion', 'incendio'])
  })

  for (const h of HISTORIAS) {
    it(`${h.clave}: cada parte tiene título y párrafos`, () => {
      for (const parte of [h.queCambia, h.queVeElRadar, h.hipotesis, h.aplicaciones]) {
        expect(parte.titulo.length).toBeGreaterThan(5)
        expect(parte.parrafos.length).toBeGreaterThan(0)
      }
      expect(h.comparador.titulo).toBeTruthy()
      expect(h.comparador.introduccion.length).toBeGreaterThan(0)
    })

    it(`${h.clave}: las hipótesis empiezan por «${PREFIJO_HIPOTESIS}»`, () => {
      for (const p of h.hipotesis.parrafos) expect(aTexto(p).startsWith(PREFIJO_HIPOTESIS)).toBe(true)
    })

    it(`${h.clave}: sin años entre 1900 y 2025, sin cifras de eventos ni la palabra «real» en las partes de ejemplo`, () => {
      const todo = JSON.stringify(h)
      expect(todo).not.toMatch(/\b(19\d\d|20[01]\d|202[0-5])\b/)
      // Sin cantidades con unidad (muertos, hectáreas, millones…) en el texto escrito a mano.
      expect(SEGMENTOS_TEXTO(h).map(aTexto).join(' ')).not.toMatch(/\d+\s*(km|ha\b|hect|%|muert|famil|millon|mil\b)/i)
      const ejemplo = [...h.queCambia.parrafos, ...h.queVeElRadar.parrafos, ...h.comparador.introduccion, h.comparador.porQue, h.comparador.otra, ...h.hipotesis.parrafos].map(aTexto).join(' ')
      expect(ejemplo).not.toMatch(/\breal(es)?\b/i)
    })

    it(`${h.clave}: lo específico de la misión se marca como pendiente de confirmar`, () => {
      expect(aTexto(h.queVeElRadar.parrafos[h.queVeElRadar.parrafos.length - 1])).toContain('pendiente de confirmar con la documentación oficial')
      expect(aTexto(h.aplicaciones.parrafos[0])).toContain('pendiente de confirmar con la documentación oficial')
    })
  }
})

describe('Historias · pantalla', () => {
  it('muestra el nombre del producto, el índice y las cinco partes de la inundación', async () => {
    montar()
    expect(screen.getByRole('heading', { level: 1, name: 'NISAR · Ecuador' })).toBeInTheDocument()
    const indice = screen.getByRole('navigation', { name: 'Historias' })
    expect(within(indice).getAllByRole('link')).toHaveLength(2)
    expect(await screen.findByRole('heading', { name: HISTORIAS[0].titulo })).toBeInTheDocument()
    const partes = screen.getAllByRole('heading', { level: 3 })
    expect(partes.map((x) => x.textContent)).toEqual([
      HISTORIAS[0].queCambia.titulo, HISTORIAS[0].queVeElRadar.titulo, HISTORIAS[0].comparador.titulo, HISTORIAS[0].hipotesis.titulo, HISTORIAS[0].aplicaciones.titulo,
    ])
  })

  it('el comparador carga HH en la inundación, con el escenario descubierto por su campo historia', async () => {
    montar()
    const fig = await screen.findByRole('figure')
    expect(fig.querySelector('figcaption')?.textContent).toBe('σ⁰ HH, dB')
    const cambio = llamadas.find((l) => l.url === '/api/escenarios/ec_agua/cambio')!
    expect(cambio.cuerpo).toEqual({ antes: fechas[0], despues: fechas[3], polarizacion: 'HH' })
    expect(await screen.findByText(/^En este escenario de demostración, superficie inundada baja de/)).toBeInTheDocument()
    expect(screen.getByText('Nota del modelo de demostración.')).toBeInTheDocument()
  })

  it('el comparador carga HV en el incendio y se puede cambiar a HH', async () => {
    montar('/?historia=incendio')
    await screen.findByRole('heading', { name: HISTORIAS[1].titulo })
    const fig = await screen.findByRole('figure')
    expect(fig.querySelector('figcaption')?.textContent).toBe('σ⁰ HV, dB')
    expect(llamadas.some((l) => l.url === '/api/escenarios/ec_fuego/cambio' && l.cuerpo.polarizacion === 'HV')).toBe(true)
    screen.getByRole('tab', { name: 'HH' }).click()
    await waitFor(() => expect(screen.getByRole('figure').querySelector('figcaption')?.textContent).toBe('σ⁰ HH, dB'))
  })

  it('hay enlace al observatorio con el mismo escenario', async () => {
    montar()
    await screen.findByRole('figure')
    const href = screen.getByRole('link', { name: 'Ver en el Observatorio' }).getAttribute('href')!
    const q = new URLSearchParams(href.split('?')[1])
    expect(href.startsWith('/observatorio?')).toBe(true)
    expect(q.get('escenario')).toBe('ec_agua')
    expect(q.get('antes')).toBe(fechas[0])
    expect(q.get('despues')).toBe(fechas[3])
  })

  it('la primera vez cada término se explica y las siguientes ya no son botones', async () => {
    montar()
    await screen.findByRole('figure')
    expect(screen.getAllByRole('button', { name: 'σ⁰' })).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: 'banda L' })).toHaveLength(1)
  })

  it('sin escenario para la historia, lo dice', async () => {
    vi.stubGlobal('fetch', vi.fn((url: string) => json(url === '/api/escenarios' ? [escenario('ec_otro', null)] : {})))
    montar()
    expect(await screen.findByText('Esta historia no tiene escenario')).toBeInTheDocument()
  })
})

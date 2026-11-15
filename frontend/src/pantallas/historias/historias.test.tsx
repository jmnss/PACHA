import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { historiasDe, HISTORIAS } from './contenido'
import { PASOS, type Parrafo } from './contenido/tipos'
import Historias from './Historias'

const origen = { tipo: 'real', clase: 'nisar', fuente: 'equipo PACHA', producto: 'GCOV', procedencia: { producto: 'GCOV', fecha: '2026-08-13', polarizaciones: ['HH', 'HV'] } }
const BBOX = [-78.7, -2.7, -78.5, -2.5]
const rejilla = { filas: 2, columnas: 2, vmin: -20, vmax: -2, bbox: BBOX, datos_b64: btoa(String.fromCharCode(1, 80, 160, 255)) }
const adq = (f: string, pols: string[]) => ({ id: f.replace(/-/g, ''), instante: `${f}T12:00:00Z`, fecha: f, hora_conocida: false, direccion_orbital: null, polarizaciones: pols })
const escenario = (id: string, historia: string, sitio: string, adqs: ReturnType<typeof adq>[], variables: string[]) => ({
  id, nombre: `Nombre ${id}`, tipo_cambio: 'x', historia, sitio, region: 'Sierra', bbox: BBOX, resolucion_m: 30,
  polarizaciones: ['HH', 'HV'], variables, origen, instante_evento: null,
  capacidades: { simulacion: false, modelo_continuo: false, verdad_terreno: false }, adquisiciones: adqs,
})
const ESCENARIOS = [
  escenario('embalse-mazar', 'embalse', 'mazar', [adq('2026-08-13', ['HH', 'HV']), adq('2026-10-29', [])], ['mascara', 'gamma0']),
  escenario('embalse-daule-peripa', 'embalse', 'daule-peripa', [adq('2026-06-26', ['HH', 'HV']), adq('2026-10-12', ['HH', 'HV'])], ['mascara', 'gamma0']),
  escenario('incendio-casitagua', 'incendio', 'casitagua', [adq('2026-09-13', ['HH', 'HV']), adq('2026-09-25', ['HH', 'HV'])], ['mascara', 'gamma0', 'delta_rfdi']),
]
const fuente = { nombre: 'Periódico', url: 'https://example.org/nota', cita: 'una cita', consulta: '2026-11-15' }
const est = (pol: string, clase: number | null) => ({ polarizacion: pol, mediana_db: -6, p2_db: -10, p98_db: -1, mediana_clase_db: clase, mediana_resto_db: clase === null ? null : -5.6 })
const RESUMEN: Record<string, unknown> = {
  'embalse-mazar': {
    escenario_id: 'embalse-mazar', nombre: 'Embalse Mazar', historia: 'embalse', origen, escala_db: {},
    fechas: [
      { adquisicion_id: '20260813', fecha: '2026-08-13', superficie_km2: 7.0792, retrodispersion: [est('HH', -11.81), est('HV', -18.19)] },
      { adquisicion_id: '20261029', fecha: '2026-10-29', superficie_km2: 5.6683, retrodispersion: [] },
    ],
    variacion: { antes_id: '20260813', despues_id: '20261029', fecha_antes: '2026-08-13', fecha_despues: '2026-10-29', dias: 77, antes_km2: 7.08, despues_km2: 5.67, absoluta_km2: -1.41, relativa_pct: -19.9 },
    incendio: null,
    ficha: [{ id: 'potencia_central', clave_texto: 'api.ficha.potencia_central', etiqueta: 'Potencia instalada de la central', valor: 170, unidad: 'MW', nombre_propio: null, fuente }],
    lecturas: [{ clave_texto: 'api.resumen.lectura.embalse.contraste', valores_texto: {}, decimales_texto: {}, texto: 'El agua se ve más oscura en HH.' }],
  },
  'incendio-casitagua': {
    escenario_id: 'incendio-casitagua', nombre: 'Cerro Casitagua', historia: 'incendio', origen, escala_db: {},
    fechas: [
      { adquisicion_id: '20260913', fecha: '2026-09-13', superficie_km2: null, retrodispersion: [est('HH', null), est('HV', null)] },
      { adquisicion_id: '20260925', fecha: '2026-09-25', superficie_km2: 19.42, retrodispersion: [est('HH', -5.31), est('HV', -9.04)] },
    ],
    variacion: null,
    incendio: { adquisicion_id: '20260925', fecha: '2026-09-25', area_marcada_km2: 19.42, area_marcada_ha: 1942, delta_rfdi_mediana_dentro: 0.26, delta_rfdi_mediana_fuera: 0.27, delta_rfdi_diferencia: -0.01 },
    ficha: [{ id: 'fecha_inicio', clave_texto: 'api.ficha.fecha_inicio', etiqueta: 'Inicio del incendio', valor: '2026-09-17', unidad: '', nombre_propio: null, fuente }],
    lecturas: [{ clave_texto: 'api.resumen.lectura.incendio.area', valores_texto: {}, decimales_texto: {}, texto: 'La máscara del equipo marca 19,42 km² como quemados.' }],
  },
}
const COMPARACION = {
  origen, dias_entre_antes: 48, dias_entre_despues: 17, lecturas: [],
  sitios: [
    { escenario_id: 'embalse-mazar', nombre: 'Embalse Mazar', variacion: (RESUMEN['embalse-mazar'] as { variacion: unknown }).variacion },
    { escenario_id: 'embalse-daule-peripa', nombre: 'Embalse Daule-Peripa', variacion: { antes_id: '20260626', despues_id: '20261012', fecha_antes: '2026-06-26', fecha_despues: '2026-10-12', dias: 108, antes_km2: 116.02, despues_km2: 113.42, absoluta_km2: -2.6, relativa_pct: -2.2 } },
  ],
}
const capa = (variable: string, pol: string | null) => ({
  escenario_id: 'x', adquisicion_id: null, instante: null, polarizacion: pol, origen, rejilla, variable,
  paleta: variable === 'mascara' ? 'categorias' : variable === 'delta_rfdi' ? 'divergente' : 'gris', unidad: variable === 'gamma0' ? 'dB' : '',
  leyenda: variable === 'mascara' ? [['agua', '#2a6fb0'], ['no agua', '#6f6d7a']] : null,
})
let llamadas: string[]
const json = (x: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(x), { status }))

beforeEach(() => {
  llamadas = []
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    llamadas.push(url)
    if (url === '/api/escenarios') return json(ESCENARIOS)
    if (url === '/api/comparacion/embalses') return json(COMPARACION)
    const r = /^\/api\/escenarios\/([^/]+)\/resumen$/.exec(url)
    if (r) return json(RESUMEN[r[1]] ?? RESUMEN['embalse-mazar'])
    if (url.includes('/capa?')) {
      const q = new URLSearchParams(url.split('?')[1])
      return json(capa(q.get('variable')!, q.get('polarizacion')))
    }
    return json({ mensaje: 'no previsto' }, 404)
  }))
})
afterEach(() => { vi.unstubAllGlobals() })


function montar(ruta = '/explorar/historias') {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={cliente}><MemoryRouter initialEntries={[ruta]}><Historias /></MemoryRouter></QueryClientProvider>,
  )
}

const aTexto = (p: Parrafo) => p.map((s) => (typeof s === 'string' ? s : s.termino)).join('')

describe('Historias · contenido', () => {
  it('dos historias: embalses primero, luego el incendio; las mismas claves en es/en/qu', () => {
    expect(HISTORIAS.map((h) => h.clave)).toEqual(['embalses', 'incendio'])
    for (const idioma of ['en', 'qu'] as const) expect(historiasDe(idioma).map((h) => h.clave)).toEqual(['embalses', 'incendio'])
  })

  for (const h of HISTORIAS) {
    it(`${h.clave}: cuatro pasos con titular y frase, sin años ni demostración`, () => {
      for (const clave of PASOS) {
        const p = h.pasos[clave]
        expect(p.titular.length).toBeGreaterThan(5)
        expect(p.frase.length).toBeGreaterThan(10)
        if (clave !== 'simular') expect(p.cifra).toBeTruthy()
      }
      const todo = PASOS.flatMap((k) => [h.pasos[k].frase, ...h.pasos[k].detalle.map(aTexto)]).join(' ')
      expect(JSON.stringify(h)).not.toMatch(/\b(19\d\d|20\d\d)\b/)
      expect(JSON.stringify(h)).not.toMatch(/demostraci|sintétic|ilustrativ/i)
      expect(todo.length).toBeGreaterThan(100)
    })
  }
})

describe('Historias · pantalla', () => {
  it('por defecto: embalses, Mazar, paso 1 con la máscara, la superficie y la ficha con su fuente', async () => {
    montar()
    expect(await screen.findByRole('heading', { level: 2, name: HISTORIAS[0].titulo })).toBeInTheDocument()
    expect(screen.getByText('Paso 1 de 4')).toBeInTheDocument()
    const fig = await screen.findByRole('figure')
    expect(fig.querySelector('figcaption')?.textContent).toBe('Máscara de agua')
    expect(await screen.findByText('7,08 km²')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Periódico' })).toHaveAttribute('href', 'https://example.org/nota')
    expect(screen.queryByText(/Por llegar|demostración/)).not.toBeInTheDocument()
  })

  it('Mazar paso 2: la fecha sin imagen de radar no se pide; HH y HV de la misma fecha', async () => {
    montar('/explorar/historias?paso=2')
    await waitFor(() => expect(screen.getByRole('figure').querySelector('figcaption')?.textContent).toBe('γ⁰ HH / HV, dB'))
    const radar = llamadas.filter((u) => u.includes('variable=gamma0'))
    expect(radar.length).toBeGreaterThan(0)
    expect(radar.every((u) => u.includes('adquisicion=20260813'))).toBe(true)
    expect(await screen.findByText('El agua se ve más oscura en HH.')).toBeInTheDocument()
  })

  it('Daule-Peripa paso 4: variación y comparación entre los dos embalses', async () => {
    montar('/explorar/historias?historia=embalses&sitio=daule-peripa&paso=4')
    expect(await screen.findByText('Paso 4 de 4')).toBeInTheDocument()
    expect(await screen.findByRole('table')).toBeInTheDocument()
    expect(screen.getByText('Embalse Daule-Peripa')).toBeInTheDocument()
  })

  it('el paso Simular lleva el rótulo «Simulación» y el enlace al Simulador', async () => {
    montar('/explorar/historias?paso=3')
    const pasos = await screen.findAllByRole('listitem')
    const simular = pasos.filter((li) => li.classList.contains('paso'))[2]
    expect(within(simular).getByRole('note')).toBeInTheDocument()
    expect(within(simular).getByRole('link', { name: 'Abrir el Simulador' })).toHaveAttribute('href', '/simular')
  })

  it('incendio: con su fecha y su fuente; paso 4 con máscara de quemado y ΔRFDI', async () => {
    montar('/explorar/historias?historia=incendio&paso=4')
    expect(await screen.findByRole('heading', { level: 2, name: HISTORIAS[1].titulo })).toBeInTheDocument()
    expect(await screen.findByText(/Incendio del 17 sep 2026/)).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('figure').querySelector('figcaption')?.textContent).toBe('Máscara de quemado del equipo'))
    expect(screen.getByText(/^1.?942 ha$/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: 'ΔRFDI' }))
    await waitFor(() => expect(llamadas.some((u) => u.includes('variable=delta_rfdi') && u.includes('adquisicion=20260925'))).toBe(true))
    // La máscara solo se pide para la fecha que la tiene.
    expect(llamadas.some((u) => u.includes('variable=mascara') && u.includes('adquisicion=20260913'))).toBe(false)
  })

  it('llamado final al Observatorio con el escenario elegido', async () => {
    montar()
    await screen.findByRole('figure')
    const href = screen.getByRole('link', { name: 'Explóralo tú en el Observatorio' }).getAttribute('href')!
    const q = new URLSearchParams(href.split('?')[1])
    expect(q.get('escenario')).toBe('embalse-mazar')
  })

  it('sin escenario para la historia, lo dice', async () => {
    vi.stubGlobal('fetch', vi.fn(() => json([])))
    montar()
    expect(await screen.findByText('Esta historia no tiene escenario')).toBeInTheDocument()
  })
})

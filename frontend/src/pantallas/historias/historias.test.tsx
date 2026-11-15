import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { historiasDe, HISTORIAS } from './contenido'
import { PASOS, type Parrafo } from './contenido/tipos'
import Historias from './Historias'

const origen = { tipo: 'sintetico', fuente: 'demo', generador: 'datos/proveedores/sustituto.py', version: null, semilla: 7, fecha_generacion: '2026-11-04T00:00:00Z' }
const BBOX = [-78.7, -2.7, -78.5, -2.5]
const rejilla = { filas: 2, columnas: 2, vmin: -20, vmax: -2, bbox: BBOX, datos_b64: btoa(String.fromCharCode(1, 80, 160, 255)) }
const FECHAS_EMB = ['2026-06-17', '2026-11-05']
const FECHAS_INC = ['2026-04-24', '2026-05-06', '2026-05-18', '2026-05-30']
const escenario = (id: string, historia: string | null, sitio: string | null, fechas: string[], variables: string[]) => ({
  id, nombre: `Nombre ${id}`, tipo_cambio: 'x', historia, sitio, region: 'Sierra', bbox: BBOX, resolucion_m: 30,
  polarizaciones: ['HH', 'HV'], variables, origen, instante_evento: null,
  capacidades: { simulacion: false, modelo_continuo: false, verdad_terreno: false },
  adquisiciones: fechas.map((f) => ({ id: f, instante: `${f}T00:00:00Z`, direccion_orbital: 'Ascendente', polarizaciones: ['HH', 'HV'] })),
})
const ESCENARIOS = [
  escenario('ec_la_segua', 'inundacion', null, FECHAS_INC, ['sigma0']),
  escenario('embalse-mazar', 'embalse', 'mazar', FECHAS_EMB, ['mascara', 'gamma0']),
  escenario('embalse-daule-peripa', 'embalse', 'daule-peripa', FECHAS_EMB, ['mascara', 'gamma0']),
  escenario('incendio-casitagua', 'incendio', 'casitagua', FECHAS_INC, ['sigma0']),
]
const capa = (variable: string, pol: string | null) => ({
  escenario_id: 'x', adquisicion_id: null, instante: null, polarizacion: pol, origen, rejilla, variable,
  paleta: variable === 'mascara' ? 'categorias' : 'gris', unidad: variable === 'mascara' ? '' : 'dB',
  leyenda: variable === 'mascara' ? [['agua', '#2a6fb0'], ['no agua', '#6f6d7a']] : null,
})
let llamadas: { url: string; cuerpo: any }[] // eslint-disable-line @typescript-eslint/no-explicit-any
const json = (x: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(x), { status }))

beforeEach(() => {
  llamadas = []
  vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => {
    llamadas.push({ url, cuerpo: init?.body ? JSON.parse(String(init.body)) : undefined })
    if (url === '/api/salud') return json({ estado: 'ok', hay_sinteticos: true, origen_tipo: 'sintetico', proveedor: 'mixto', version: '1' })
    if (url === '/api/escenarios') return json(ESCENARIOS)
    if (url.startsWith('/api/contexto')) return json(null)
    if (url.includes('/capa?')) return json(capa('mascara', null))
    if (url.endsWith('/cambio')) {
      const cuerpo = JSON.parse(String(init?.body))
      const embalse = url.includes('embalse')
      const variable = embalse ? 'gamma0' : 'sigma0'
      return json({
        antes: capa(variable, cuerpo.polarizacion), despues: capa(variable, cuerpo.polarizacion), cambio: capa(variable, cuerpo.polarizacion),
        capas_extra: [], clasificacion: null, tablas: [], vectores: null, origen, notas: [],
        metricas: embalse
          ? [{ etiqueta: 'Variación relativa', valor: '-30,0', unidad: '%', ayuda: '', clave_texto: 'api.cambio.metrica.embalse.variacion_relativa', valores_texto: { valor: -30 } }]
          : [{ etiqueta: 'Área quemada detectada', valor: '14,3', unidad: 'km²', ayuda: '', clave_texto: 'api.obs.metrica.area_quemada_detectada', valores_texto: { valor: 14.3 } }],
        series: [{ titulo: 'Superficie de agua', unidad: 'km²', origen, puntos: (embalse ? FECHAS_EMB : FECHAS_INC).map((f, i) => [`${f}T00:00:00Z`, [5.94, 4.16, 3, 2][i], 'S']) }],
      })
    }
    return json({ mensaje: 'no previsto' }, 404)
  }))
})
afterEach(() => { vi.unstubAllGlobals() })

let ubicacion = ''
function Espia() {
  const l = useLocation()
  ubicacion = l.search
  return null
}

function montar(ruta = '/explorar/historias') {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={cliente}><MemoryRouter initialEntries={[ruta]}><Historias /><Espia /></MemoryRouter></QueryClientProvider>,
  )
}

const aTexto = (p: Parrafo) => p.map((s) => (typeof s === 'string' ? s : s.termino)).join('')

describe('Historias · contenido', () => {
  it('dos historias: embalses primero, luego el incendio; las mismas claves en es/en/qu', () => {
    expect(HISTORIAS.map((h) => h.clave)).toEqual(['embalses', 'incendio'])
    for (const idioma of ['en', 'qu'] as const) {
      const otras = historiasDe(idioma)
      expect(otras.map((h) => h.clave)).toEqual(['embalses', 'incendio'])
      otras.forEach((h, i) => expect(h.pasos.impactos.porLlegar.length).toBe(HISTORIAS[i].pasos.impactos.porLlegar.length))
    }
  })

  for (const h of HISTORIAS) {
    it(`${h.clave}: cuatro pasos con titular, frase, cifra y sin años`, () => {
      for (const clave of PASOS) {
        const p = h.pasos[clave]
        expect(p.titular.length).toBeGreaterThan(5)
        expect(p.frase.length).toBeGreaterThan(10)
        expect(p.cifra).toBeTruthy()
      }
      const todo = PASOS.flatMap((k) => [h.pasos[k].frase, ...h.pasos[k].detalle.map(aTexto)]).join(' ')
      expect(JSON.stringify(h)).not.toMatch(/\b(19\d\d|20\d\d)\b/)
      expect(todo.length).toBeGreaterThan(100)
    })
  }
})

describe('Historias · pantalla', () => {
  it('por defecto: embalses, Mazar, paso 1 de 4 con la máscara de agua y la cifra de la API', async () => {
    montar()
    expect(await screen.findByRole('heading', { level: 2, name: HISTORIAS[0].titulo })).toBeInTheDocument()
    expect(screen.getByText('Paso 1 de 4')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem').filter((li) => li.classList.contains('paso'))).toHaveLength(4)
    const fig = await screen.findByRole('figure')
    expect(fig.querySelector('figcaption')?.textContent).toBe('Máscara de agua')
    expect(llamadas.some((l) => l.url.startsWith('/api/escenarios/embalse-mazar/capa?') && l.url.includes('variable=mascara'))).toBe(true)
    expect(await screen.findByText('5,94 km²')).toBeInTheDocument()
    expect(screen.queryByText(/La Segua/)).not.toBeInTheDocument()
  })

  it('cada cifra lleva su sello de origen y los huecos dicen «Por llegar»', async () => {
    montar()
    await screen.findByText('5,94 km²')
    const pasos = screen.getAllByRole('listitem').filter((li) => li.classList.contains('paso'))
    expect(pasos[0].querySelector('[data-origen="sintetico"]')).not.toBeNull()
    expect(within(pasos[0]).getAllByText('Por llegar').length).toBeGreaterThan(0)
    // Simular (embalse) aún no existe: cifra «Por llegar», sin número.
    expect(within(pasos[2]).getByText('Por llegar')).toBeInTheDocument()
  })

  it('al abrir el paso 2 cambia la URL y el comparador pasa a la señal del radar en HH', async () => {
    montar()
    await screen.findByRole('figure')
    fireEvent.click(screen.getByRole('button', { name: /Paso 2/ }))
    await waitFor(() => expect(ubicacion).toContain('paso=2'))
    expect(screen.getByText('Paso 2 de 4')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('figure').querySelector('figcaption')?.textContent).toBe('γ⁰ HH, dB'))
    fireEvent.click(screen.getByRole('radio', { name: 'HV' }))
    await waitFor(() => expect(ubicacion).toContain('pol=HV'))
  })

  it('el sitio y el paso se leen de la URL', async () => {
    montar('/explorar/historias?historia=embalses&sitio=daule-peripa&paso=4')
    expect(await screen.findByText('Paso 4 de 4')).toBeInTheDocument()
    await waitFor(() => expect(llamadas.some((l) => l.url === '/api/escenarios/embalse-daule-peripa/cambio')).toBe(true))
    expect((await screen.findAllByText(/-30.0/)).length).toBeGreaterThan(0)
  })

  it('incendio: Casitagua sin fecha, con «evento real · fuente por añadir» y el área detectada', async () => {
    montar('/explorar/historias?historia=incendio&paso=2')
    expect(await screen.findByRole('heading', { level: 2, name: HISTORIAS[1].titulo })).toBeInTheDocument()
    expect(screen.getByText('evento real · fuente por añadir')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('figure').querySelector('figcaption')?.textContent).toBe('σ⁰ HV, dB'))
    expect(await screen.findByText(/14,3/)).toBeInTheDocument()
  })

  it('llamado final al Observatorio con el escenario elegido', async () => {
    montar()
    await screen.findByRole('figure')
    const href = screen.getByRole('link', { name: 'Explóralo tú en el Observatorio' }).getAttribute('href')!
    const q = new URLSearchParams(href.split('?')[1])
    expect(href.startsWith('/explorar/observatorio?')).toBe(true)
    expect(q.get('escenario')).toBe('embalse-mazar')
    expect(q.get('antes')).toBe(FECHAS_EMB[0])
    expect(q.get('despues')).toBe(FECHAS_EMB[1])
  })

  it('sin escenario para la historia, lo dice', async () => {
    vi.stubGlobal('fetch', vi.fn((url: string) => json(url === '/api/escenarios' ? [ESCENARIOS[0]] : {})))
    montar()
    expect(await screen.findByText('Esta historia no tiene escenario')).toBeInTheDocument()
  })
})

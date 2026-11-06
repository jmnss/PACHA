import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderConIdioma, renderPseudo, textosSinTraducir } from '../../idioma/pruebas'
import type { CodigoIdioma } from '../../idioma/idiomas'
import { hallazgo } from './derivados'
import { traductor } from '../../idioma/traductor'
import Observatorio from './Observatorio'

// MapLibre no corre en jsdom: el mapa falso ofrece dos «clics» y deja pasar a sus hijos.
vi.mock('../../mapa/MapaBase', () => ({
  MapaBase: ({ onClic, onFueraDeEcuador, children }: {
    onClic?: (lat: number, lon: number) => void
    onFueraDeEcuador?: (lat: number, lon: number) => void
    children?: ReactNode
  }) => (
    <div data-testid="mapa-falso">
      <button onClick={() => onClic?.(-1.0, -80.0)}>Clic dentro de Ecuador</button>
      <button onClick={() => onFueraDeEcuador?.(-12.05, -77.04)}>Clic fuera de Ecuador</button>
      <button onClick={() => onClic?.(-12.05, -77.04)}>Clic en el Pacífico por onClic</button>
      {children}
    </div>
  ),
}))

const origenSint = { tipo: 'sintetico', fuente: 'Generador de demostración', generador: 'datos/generador.py', version: '1', semilla: 7, fecha_generacion: '2026-11-04T00:00:00Z' }
const origenReal = { tipo: 'real', fuente: 'NASA POWER (climatología 2001–2025) y geoBoundaries', fecha_generacion: '2026-11-04T00:00:00Z', notas: 'Contexto climático real complementario; no es una observación de NISAR.' }
const BBOX = [-80.24, -0.74, -80.16, -0.66]
const rejilla = { filas: 2, columnas: 2, vmin: -20, vmax: -2, bbox: BBOX, datos_b64: btoa(String.fromCharCode(1, 80, 160, 255)) }
const fechas = ['2026-04-12', '2026-04-24', '2026-05-06', '2026-05-18']

const escenario = (id: string, nombre: string) => ({
  id, nombre, tipo_cambio: 'humedales', historia: 'inundacion', region: 'Manabí (Costa)', bbox: BBOX, resolucion_m: 100,
  polarizaciones: ['HH', 'HV'], variables: ['sigma0'], origen: origenSint,
  capacidades: { simulacion: true, modelo_continuo: true, verdad_terreno: true },
  adquisiciones: fechas.map((f) => ({ id: f, instante: `${f}T00:00:00Z`, direccion_orbital: 'Ascendente', polarizaciones: ['HH', 'HV'] })),
})
const BASE = escenario('ec_x', 'Humedal de prueba')
const DERIVADO = escenario('ec_x~abc123', 'Punto en Manabí')

const capa = (extra: object) => ({ escenario_id: 'ec_x', adquisicion_id: null, instante: null, polarizacion: null, origen: origenSint, rejilla, ...extra })
const CAMBIO = {
  antes: capa({ variable: 'sigma0', paleta: 'gris', unidad: 'dB', leyenda: null }),
  despues: capa({ variable: 'sigma0', paleta: 'gris', unidad: 'dB', leyenda: null }),
  cambio: capa({ variable: 'cambio_de_inundacion', paleta: 'categorias', unidad: '', leyenda: [['Nueva inundación', '#009dcc'], ['Pérdida de inundación', '#e0369b'], ['Inundación persistente', '#8a63f0']] }),
  capas_extra: [], clasificacion: null, notas: [], tablas: [], vectores: null, origen: origenSint,
  metricas: [{ etiqueta: 'Área inundada inicial', valor: '26,8', unidad: 'km²', ayuda: 'Agua abierta + vegetación inundada' }],
  series: [{ titulo: 'Superficie inundada', unidad: 'km²', origen: origenSint, puntos: [
    ['2026-04-12T00:00:00Z', 26.8, 'Detectada por el modelo (simulación)'], ['2026-04-24T00:00:00Z', 20.1, 'Detectada por el modelo (simulación)'],
    ['2026-05-06T00:00:00Z', 9.0, 'Detectada por el modelo (simulación)'], ['2026-05-18T00:00:00Z', 5.5, 'Detectada por el modelo (simulación)'],
    ['2026-05-18T00:00:00Z', 5.8, 'Verdad del modelo'],
  ] }],
}
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const CONTEXTO = {
  origen: origenReal, lat: -0.7, lon: -80.2, fecha: '2026-11-04', mes_actual: 11, region: 'Costa', provincia: 'Manabí',
  estacion_astronomica: { estacion: 'primavera austral', hemisferio: 'sur', declinacion_deg: -15, elevacion_mediodia_deg: 75, duracion_dia_h: 12, proximo_hito: 'solsticio de diciembre', fecha_proximo_hito: '2026-12-22', pasos_cenitales: [] },
  temporada: { temporada: 'Seca', nombre_local: '«verano»', prec_mes_mm: 15, prec_media_mm: 79, et0_mes_mm: 145, t2m_c: 25.7, regimen: 'unimodal', meses_lluviosos: [], meses_secos: [] },
  humedad_suelo: 0.0835, elevacion_malla_m: 129, metodo_climatologia: 'bilineal',
  clima_mensual: MESES.map((mes, i) => ({ mes, mes_num: i + 1, precipitacion_mm: 100 - i * 5, et0_mm: 100, temperatura_c: 25, temporada: i < 5 ? 'Lluviosa' : 'Seca' })),
}


function json(x: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(x), { status }))
}
function simularFetch(contexto: unknown = CONTEXTO) {
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    if (url === '/api/salud') return json({ estado: 'ok', hay_sinteticos: true, origen_tipo: 'sintetico', proveedor: 'demo', version: '1' })
    if (url === '/api/escenarios') return json([BASE])
    if (url === '/api/tipos') return json([{ id: 'humedales', nombre: 'Pérdida de humedales', descripcion: 'El agua refleja el radar lejos del satélite y se ve oscura.' }, { id: 'incendios', nombre: 'Incendios forestales' }])
    if (url === '/api/escenarios/ec_x') return json(BASE)
    if (url === '/api/escenarios/ec_uno') return json({ ...BASE, id: 'ec_uno', nombre: 'Escena de una pasada', adquisiciones: BASE.adquisiciones.slice(0, 1) })
    if (url.startsWith('/api/escenarios/ec_x~caducado')) return json({ mensaje: 'El escenario no existe.' }, 404)
    if (url === '/api/escenarios/ec_x~abc123') return json(DERIVADO)
    if (url.startsWith('/api/escenarios/ec_x/capa')) return json(capa({ variable: 'sigma0', paleta: 'gris', unidad: 'dB', leyenda: null, adquisicion_id: '2026-04-12' }))
    if (url.endsWith('/cambio')) return json(CAMBIO)
    if (url.startsWith('/api/contexto')) return json(contexto)
    if (url === '/api/simulacion/escenario') return json(DERIVADO)
    if (url === '/api/simulacion/fotogramas') return json(Array.from({ length: 120 }, (_, i) => capa({ variable: 'estado_modelo', paleta: 'gris', unidad: 'dB', leyenda: null, instante: new Date(Date.parse('2026-04-12T00:00:00Z') + i * 3_600_000).toISOString() })))
    return json({ mensaje: 'no previsto' }, 404)
  }))
}

beforeEach(() => simularFetch())
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

function montar(ruta: string, render: typeof renderPseudo = renderPseudo) {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={cliente}>
      <MemoryRouter initialEntries={[ruta]}><Observatorio /></MemoryRouter>
    </QueryClientProvider>,
  )
}
const esperar = () => screen.findByText('⟦Parámetros del modelo⟧', undefined, { timeout: 3000 })

describe('Observatorio · idioma', () => {
  for (const vista of ['mapa', 'comparar', 'serie', 'impacto']) {
    it(`la estructura de la pestaña «${vista}» pasa por el traductor`, async () => {
      const { container } = montar(`/observatorio?escenario=ec_x&vista=${vista}`)
      await esperar()
      expect(textosPropios(container)).toEqual([])
    })
  }

  it('el panel de parámetros y la ayuda del radar pasan por el traductor', async () => {
    const { container } = montar('/observatorio?escenario=ec_x')
    await screen.findByText(/⟦Estos parámetros/)
    fireEvent.click(screen.getByText(/⟦Cómo ve el radar/))
    expect(textosPropios(container)).toEqual([])
    expect(screen.getByText(/⟦Los detalles de NISAR/)).toBeInTheDocument()
  })

  it('el contexto del lugar pasa por el traductor y deja el texto de la API marcado', async () => {
    const { container } = montar('/observatorio?escenario=ec_x')
    const titulo = await screen.findByRole('heading', { name: '⟦Contexto del lugar⟧' })
    const panel = titulo.closest('section') as HTMLElement
    await within(panel).findByText('Costa')
    expect(textosPropios(panel)).toEqual([])
    expect(textosPropios(container)).toEqual([])
    expect(within(panel).getByText('primavera austral')).toHaveAttribute('lang', 'es')
  })

  it.each<[CodigoIdioma, string]>([['en', 'Context of the place'], ['qu', 'Pachapa tiyashka pacha'], ['es', 'Contexto del lugar']])(
    'en %s el título del contexto y los meses salen del idioma activo', async (idioma, titulo) => {
      montar('/observatorio?escenario=ec_x', (ui) => renderConIdioma(ui, idioma))
      expect(await screen.findByRole('heading', { name: titulo })).toBeInTheDocument()
    },
  )

  it('mapa, cinta de tiempo y métricas pasan por el traductor', async () => {
    const { container } = montar('/observatorio?escenario=ec_x&vista=mapa')
    await screen.findByRole('button', { name: '⟦Ver todo Ecuador⟧' })
    await screen.findByText('⟦Métricas del cambio⟧')
    const tarjetas = container.querySelectorAll<HTMLElement>('.vista-mapa, .bloque-tiempo, .panel-metricas__base, .franja-kpi, .observatorio__lado')
    const salida: string[] = []
    for (const el of tarjetas) salida.push(...textosSinTraducir(el))
    expect(salida.filter((x) => !API.includes(x) && !DATO.test(x) && x !== 'Costa' && !x.startsWith('Clic '))).toEqual([])
  })

  it.each<[CodigoIdioma, string]>([['en', 'That point is outside Ecuador. Choose a point inside the country.'], ['qu', 'Chay punto Ecuador hawapi kan. Mamallaktapi ukupi shuk puntota akllay.']])(
    'el aviso de «fuera de Ecuador» sale en %s', async (idioma, aviso) => {
      montar('/observatorio?escenario=ec_x&vista=mapa', (ui) => renderConIdioma(ui, idioma))
      fireEvent.click(await screen.findByText('Clic fuera de Ecuador'))
      expect(await screen.findByRole('alert')).toHaveTextContent(aviso)
    },
  )

  it('el hallazgo se arma con claves e interpola cifras y fechas del idioma', () => {
    const r = { series: [{ titulo: 'Superficie inundada', unidad: 'km²', puntos: [['2026-04-12T00:00:00Z', 26.8, 'D'], ['2026-05-18T00:00:00Z', 5.5, 'D']] }], origen: { tipo: 'sintetico' } } as never
    expect(hallazgo(r, '2026-04-12T00:00:00Z', '2026-05-18T00:00:00Z')).toBe('En este escenario de demostración, superficie inundada baja de 26,8 a 5,5 km² entre el 12 abr 2026 y el 18 may 2026.')
    expect(hallazgo(r, '2026-04-12T00:00:00Z', '2026-05-18T00:00:00Z', traductor('en').t, 'en')).toBe('In this demonstration scenario, superficie inundada falls from 26.8 to 5.5 km² between 12 Apr 2026 and 18 May 2026.')
  })
})

// Datos de la API de los mocks (nombres de tipos y escenarios) y fechas ya formateadas por el idioma activo.
const API = ['Pérdida de humedales', 'Incendios forestales', 'Humedal de prueba']
const DATO = /^\d{1,2} [A-Za-z]{3} \d{4}$|^[A-Z][a-z]+ \d{1,2}, \d{4}$|^[A-Z]$/

/**
 * Textos sin pasar por el traductor en lo propio de esta tarea (cabecera, pestañas, parámetros, ayuda y
 * contexto). Las vistas, mediciones y métricas las traducen las Tareas 10–12.
 */
function textosPropios(raiz: HTMLElement): string[] {
  const contexto = [...raiz.querySelectorAll('h2, h3')].find((h) => h.textContent === '⟦Contexto del lugar⟧')?.closest('section')
  const propios = [
    ...raiz.querySelectorAll<HTMLElement>('.cabecera, [aria-label="⟦Vistas del Observatorio⟧"], .panel-sim, .ayuda-radar'),
    ...(contexto ? [contexto as HTMLElement] : []),
  ]
  const salida: string[] = []
  for (const el of propios) salida.push(...textosSinTraducir(el))
  return salida.filter((x) => !API.includes(x) && !DATO.test(x))
}
export type { ReactNode }

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Observatorio from './Observatorio'
import { hallazgo, indiceAnterior, parejaValida, temporadasLluviosas, vecinas } from './derivados'

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

type Llamada = { url: string; metodo: string; cuerpo: unknown }
let llamadas: Llamada[]

function json(x: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(x), { status }))
}
function simularFetch() {
  llamadas = []
  vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => {
    const metodo = init?.method ?? 'GET'
    llamadas.push({ url, metodo, cuerpo: init?.body ? JSON.parse(String(init.body)) : undefined })
    if (url === '/api/salud') return json({ estado: 'ok', hay_sinteticos: true, origen_tipo: 'sintetico', proveedor: 'demo', version: '1' })
    if (url === '/api/escenarios') return json([BASE])
    if (url === '/api/tipos') return json([{ id: 'humedales', nombre: 'Pérdida de humedales' }, { id: 'incendios', nombre: 'Incendios forestales' }])
    if (url === '/api/escenarios/ec_x') return json(BASE)
    if (url === '/api/escenarios/ec_uno') return json({ ...BASE, id: 'ec_uno', nombre: 'Escena de una pasada', adquisiciones: BASE.adquisiciones.slice(0, 1) })
    if (url.startsWith('/api/escenarios/ec_x~caducado')) return json({ mensaje: 'El escenario no existe.' }, 404)
    if (url === '/api/escenarios/ec_x~abc123') return json(DERIVADO)
    if (url.startsWith('/api/escenarios/ec_x/capa')) return json(capa({ variable: 'sigma0', paleta: 'gris', unidad: 'dB', leyenda: null, adquisicion_id: '2026-04-12' }))
    if (url.endsWith('/cambio')) return json(CAMBIO)
    if (url.startsWith('/api/contexto')) return json(CONTEXTO)
    if (url === '/api/simulacion/escenario') return json(DERIVADO)
    return json({ mensaje: 'no previsto' }, 404)
  }))
}
const cambios = () => llamadas.filter((l) => l.url.endsWith('/cambio'))
const posts = () => llamadas.filter((l) => l.metodo === 'POST' && l.url === '/api/simulacion/escenario')

function Ubicacion() {
  return <output data-testid="ubicacion">{useLocation().search}</output>
}
function montar(ruta = '/observatorio?escenario=ec_x') {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={cliente}>
      <MemoryRouter initialEntries={[ruta]}>
        <Observatorio />
        <Ubicacion />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
async function listo() {
  await screen.findByTestId('mapa-falso')
  await screen.findByText(/Nueva inundación/)
}

beforeEach(simularFetch)
afterEach(() => vi.unstubAllGlobals())

describe('Observatorio · mapa y tiempo', () => {
  it('clic fuera de Ecuador muestra el aviso y no llama a la API', async () => {
    montar()
    await listo()
    await screen.findByText(/Costa/)
    const antes = llamadas.length
    fireEvent.click(screen.getByText('Clic fuera de Ecuador'))
    expect(screen.getByRole('alert')).toHaveTextContent('Ese punto está fuera de Ecuador. Elige un punto dentro del país.')
    expect(llamadas.length).toBe(antes)
    expect(posts()).toHaveLength(0)
  })

  it('clic dentro crea un escenario en el punto y pasa a él', async () => {
    montar()
    await listo()
    fireEvent.click(screen.getByText('Clic dentro de Ecuador'))
    await waitFor(() => expect(posts()).toHaveLength(1))
    expect(posts()[0].cuerpo).toEqual({ escenario_id: 'ec_x', parametros: { lat: -1.0, lon: -80.0 } })
    await waitFor(() => expect(screen.getByTestId('ubicacion').textContent).toContain('escenario=ec_x%7Eabc123'))
    await screen.findByRole('option', { name: 'Punto en Manabí' })
  })

  it('la capa alterna entre «modelo en el tiempo» y «cambio detectado»', async () => {
    montar()
    await listo()
    const cambio = screen.getByRole('tab', { name: 'Cambio detectado' })
    const modelo = screen.getByRole('tab', { name: 'Modelo en el tiempo' })
    expect(cambio).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByText('dB')).not.toBeInTheDocument()
    fireEvent.click(modelo)
    expect(modelo).toHaveAttribute('aria-selected', 'true')
    await waitFor(() => expect(llamadas.some((l) => l.url.startsWith('/api/escenarios/ec_x/capa?adquisicion=2026-04-12&variable=sigma0&polarizacion=HH'))).toBe(true))
    await waitFor(() => expect(screen.queryByText(/Nueva inundación/)).not.toBeInTheDocument())
    expect(screen.getAllByText('dB').length).toBeGreaterThan(0)
    fireEvent.click(cambio)
    expect(await screen.findByText(/Nueva inundación/)).toBeInTheDocument()
  })

  it('el reloj muestra la pasada anterior y la siguiente, y se mueve con el tiempo', async () => {
    montar()
    await listo()
    const reloj = screen.getByTestId('reloj')
    expect(reloj).toHaveTextContent('Pasada anterior · 12 abr 2026')
    expect(reloj).toHaveTextContent('Siguiente · 24 abr 2026')
    await waitFor(() => expect(reloj).toHaveTextContent('Temporada lluviosa'))
    fireEvent.click(screen.getByRole('button', { name: 'Avanzar un paso' }))
    expect(reloj).toHaveTextContent('Pasada anterior · 24 abr 2026')
    expect(reloj).toHaveTextContent('Siguiente · 6 may 2026')
  })

  it('el panel de contexto muestra región y temporada con sello de origen NASA POWER', async () => {
    montar()
    const titulo = await screen.findByRole('heading', { name: 'Contexto del lugar' })
    const panel = titulo.closest('section') as HTMLElement
    await within(panel).findByText('Costa')
    expect(within(panel).getByText('Manabí')).toBeInTheDocument()
    expect(within(panel).getByText(/Lluviosa/)).toBeInTheDocument()
    expect(within(panel).getByText(/Real · NASA POWER/)).toBeInTheDocument()
    expect(within(panel).getByRole('button', { name: 'NASA POWER' })).toBeInTheDocument()
  })

  it('el hallazgo se calcula con los datos y empieza por «En este escenario de demostración»', async () => {
    montar()
    await listo()
    const h = await screen.findByText(/^En este escenario de demostración,/)
    expect(h).toHaveTextContent('superficie inundada baja de 26,8 a 5,5 km² entre el 12 abr 2026 y el 18 may 2026.')
  })

  it('lee la vista de la URL y las vistas pendientes avisan', async () => {
    montar('/observatorio?escenario=ec_x&vista=serie')
    expect(await screen.findByRole('tab', { name: 'Serie', selected: true })).toBeInTheDocument()
    expect(screen.queryByTestId('mapa-falso')).not.toBeInTheDocument()
  })
})

describe('Observatorio · casos límite', () => {
  it('con una sola pasada no hay petición de cambio: muestra el motivo y no queda cargando', async () => {
    montar('/observatorio?escenario=ec_uno')
    expect(await screen.findAllByText('Elige dos pasadas distintas para ver el cambio.')).not.toHaveLength(0)
    expect(screen.queryByText(/Calculando/)).not.toBeInTheDocument()
    expect(cambios()).toHaveLength(0)
  })

  it.each([
    ['antes igual a después', 'antes=2026-05-06&despues=2026-05-06'],
    ['antes posterior a después', 'antes=2026-05-18&despues=2026-04-12'],
    ['pasadas que no existen', 'antes=nada&despues=tampoco'],
  ])('normaliza la pareja (%s) a los valores por defecto', async (_n, q) => {
    montar(`/observatorio?escenario=ec_x&${q}`)
    await listo()
    expect(cambios()).toHaveLength(1)
    expect(cambios()[0].cuerpo).toMatchObject({ antes: '2026-04-12', despues: '2026-05-18' })
  })

  it('un escenario caducado (404) ofrece volver al escenario base y deja los selectores', async () => {
    montar('/observatorio?escenario=ec_x~caducado')
    expect(await screen.findByRole('alert')).toHaveTextContent('El escenario no existe.')
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
    expect(screen.getByLabelText('Escenario')).toBeInTheDocument()
    expect(screen.getByLabelText('Tipo de cambio')).toBeInTheDocument()
    fireEvent.click(await screen.findByRole('button', { name: 'Volver a Humedal de prueba' }))
    await listo()
    expect(screen.getByTestId('ubicacion').textContent).toContain('escenario=ec_x')
  })

  it('el mapa y el reloj hablan de la misma pasada: la anterior o igual al instante', async () => {
    montar('/observatorio?escenario=ec_x&t=2026-04-30T00:00:00.000Z')
    await listo()
    const reloj = screen.getByTestId('reloj')
    await waitFor(() => expect(reloj).toHaveTextContent('Pasada anterior · 24 abr 2026'))
    expect(reloj).toHaveTextContent('Siguiente · 6 may 2026')
    const kpi = screen.getByText('Pasada activa').closest('div') as HTMLElement
    expect(kpi).toHaveTextContent('24 abr 2026')
    fireEvent.click(screen.getByRole('tab', { name: 'Modelo en el tiempo' }))
    await waitFor(() => expect(llamadas.some((l) => l.url.includes('/capa?adquisicion=2026-04-24&'))).toBe(true))
    expect(await screen.findByText('Pasada · 24 abr 2026')).toBeInTheDocument()
  })

  it('el motivo de un botón desactivado es texto visible y lo describe', async () => {
    montar()
    await listo()
    const boton = screen.getByRole('button', { name: 'Fijar como «después»' })
    expect(boton).toBeDisabled()
    const motivo = screen.getByText('La pasada «después» debe ser posterior a la pasada «antes».')
    expect(boton.getAttribute('aria-describedby')).toBe(motivo.id)
  })

  it('la leyenda categórica no inventa una unidad', async () => {
    montar()
    await listo()
    expect(screen.queryByText('categorías')).not.toBeInTheDocument()
  })

  it('desde un escenario derivado el clic envía el id base', async () => {
    montar('/observatorio?escenario=ec_x~abc123')
    await listo()
    fireEvent.click(screen.getByText('Clic dentro de Ecuador'))
    await waitFor(() => expect(posts()).toHaveLength(1))
    expect(posts()[0].cuerpo).toMatchObject({ escenario_id: 'ec_x' })
  })

  it('un clic fuera de Ecuador que llega por onClic también se rechaza sin llamar a la API', async () => {
    montar()
    await listo()
    const antes = llamadas.length
    fireEvent.click(screen.getByText('Clic en el Pacífico por onClic'))
    expect(screen.getByRole('alert')).toHaveTextContent('fuera de Ecuador')
    expect(llamadas.length).toBe(antes)
  })

  it('la humedad del suelo se rotula como estimada', async () => {
    montar()
    expect(await screen.findByText(/Humedad del suelo estimada/)).toBeInTheDocument()
  })
})

describe('derivados', () => {
  it('vecinas: anterior es la última pasada que no supera el instante', () => {
    expect(vecinas([10, 20, 30], 20)).toEqual({ anterior: 20, siguiente: 30 })
    expect(vecinas([10, 20, 30], 25)).toEqual({ anterior: 20, siguiente: 30 })
    expect(vecinas([10, 20, 30], 30)).toEqual({ anterior: 30, siguiente: null })
  })
  it('parejaValida y indiceAnterior', () => {
    expect(parejaValida(1, 3, 4)).toEqual([1, 3])
    expect(parejaValida(2, 2, 4)).toEqual([0, 3])
    expect(parejaValida(3, 1, 4)).toEqual([0, 3])
    expect(parejaValida(-1, 2, 4)).toEqual([0, 3])
    expect(parejaValida(0, 0, 1)).toEqual([0, 0])
    expect(indiceAnterior([10, 20, 30], 25)).toBe(1)
    expect(indiceAnterior([10, 20, 30], 20)).toBe(1)
    expect(indiceAnterior([10, 20, 30], 5)).toBe(0)
  })
  it('temporadasLluviosas une meses consecutivos', () => {
    const f = temporadasLluviosas(CONTEXTO as never, Date.UTC(2026, 0, 10), Date.UTC(2026, 7, 1))
    expect(f).toHaveLength(1)
    expect(f[0].inicio.slice(0, 10)).toBe('2026-01-01')
    expect(f[0].fin.slice(0, 10)).toBe('2026-06-01')
  })
  it('un origen real no lleva el prefijo de demostración', () => {
    const r = { ...CAMBIO, origen: origenReal } as never
    expect(hallazgo(r, '2026-04-12T00:00:00Z', '2026-05-18T00:00:00Z')).toMatch(/^Superficie inundada baja/)
  })
})

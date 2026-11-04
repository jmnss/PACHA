import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Observatorio from './Observatorio'
import { coordenadasAprox, filasCsv, leerCuadrante, leerPunto, nombreCsv, textoPunto } from './medicion'
import { valorRedondo } from './flujo'

vi.mock('../../mapa/MapaBase', () => ({ MapaBase: ({ children }: { children?: ReactNode }) => <div>{children}</div> }))

// jsdom no trae PointerEvent: una subclase de MouseEvent conserva clientX/clientY.
function stubPointerEvent() {
  class PE extends MouseEvent {
    pointerId: number
    isPrimary: boolean
    constructor(tipo: string, init: PointerEventInit = {}) { super(tipo, init); this.pointerId = init.pointerId ?? 1; this.isPrimary = init.isPrimary ?? true }
  }
  vi.stubGlobal('PointerEvent', PE)
}

const origen = { tipo: 'sintetico', fuente: 'Generador de demostración', generador: 'datos/generador.py', version: '1', semilla: 7, fecha_generacion: '2026-11-04T00:00:00Z' }
const BBOX = [-80.24, -0.74, -80.16, -0.66]
const rejilla = { filas: 2, columnas: 2, vmin: -20, vmax: -2, bbox: BBOX, datos_b64: btoa(String.fromCharCode(1, 80, 160, 255)) }
const fechas = ['2026-04-12', '2026-04-24', '2026-05-06', '2026-05-18']

const escenario = (id: string, extra: object = {}) => ({
  id, nombre: `Escenario ${id}`, tipo_cambio: 'humedales', historia: 'inundacion', region: 'Costa', bbox: BBOX, resolucion_m: 100,
  polarizaciones: ['HH', 'HV'], variables: ['sigma0'], origen,
  capacidades: { simulacion: true, modelo_continuo: true, verdad_terreno: true },
  adquisiciones: fechas.map((f) => ({ id: f, instante: `${f}T00:00:00Z`, direccion_orbital: 'Ascendente', polarizaciones: ['HH', 'HV'] })),
  ...extra,
})
const ESCENARIOS: Record<string, ReturnType<typeof escenario>> = {
  ec_x: escenario('ec_x'),
  ec_uno: escenario('ec_uno', { adquisiciones: [{ id: fechas[0], instante: `${fechas[0]}T00:00:00Z`, direccion_orbital: 'Ascendente', polarizaciones: ['HH'] }] }),
  ec_glaciar: escenario('ec_glaciar', { tipo_cambio: 'glaciares', polarizaciones: [] }),
  ec_agri: escenario('ec_agri', { tipo_cambio: 'agricultura' }),
}

const capa = (extra: object) => ({ escenario_id: 'ec_x', adquisicion_id: null, instante: null, polarizacion: 'HH', origen, rejilla, ...extra })
const BASE = {
  antes: capa({ variable: 'sigma0', paleta: 'gris', unidad: 'dB', leyenda: null }),
  despues: capa({ variable: 'sigma0', paleta: 'gris', unidad: 'dB', leyenda: null }),
  cambio: capa({ variable: 'cambio_de_inundacion', paleta: 'categorias', unidad: '', leyenda: [['Nueva inundación', '#009dcc'], ['Pérdida de inundación', '#e0369b'], ['Inundación persistente', '#8a63f0']] }),
  capas_extra: [], clasificacion: null, tablas: [], vectores: null, origen,
  notas: ['Bajo el dosel inundado, el doble rebote eleva HH.'],
  metricas: [{ etiqueta: 'Área inundada inicial', valor: '26,8', unidad: 'km²', ayuda: 'Agua abierta' }],
  series: [],
}
const VECTORES = { origen, unidad: 'm/día', x: [-1, 0, 1], y: [0, 1, -1], u: [0.01, 0.04, 0], v: [0.02, 0, 0.03] }
const PARCELAS = {
  titulo: 'Resultados por parcela', origen, columnas: ['Parcela', 'Δσ⁰ HV (dB)', 'Cambio detectado'],
  filas: Array.from({ length: 60 }, (_, i) => [`P-${i + 1}`, i / 10, i % 2 ? 'Cosecha' : null]),
}
const CAMBIOS: Record<string, object> = {
  ec_x: BASE,
  ec_glaciar: { ...BASE, vectores: VECTORES },
  ec_agri: { ...BASE, tablas: [PARCELAS] },
}

const MED_PUNTO = {
  punto: [1, 1], cuadrante: null, origen,
  metricas: [{ etiqueta: 'Posición', valor: '0,7° S, 80,2° O', unidad: '', ayuda: 'Centro del píxel (fila 1, columna 1)' }],
  tabla: [{ Capa: 'σ⁰ HH · 12/04/2026', Valor: '-4,36 dB' }, { Capa: 'σ⁰ HH · 18/05/2026', Valor: '-6,73 dB' }],
}
const MED_CUADRANTE = {
  punto: null, cuadrante: [0, 1, 0, 1], origen,
  metricas: [{ etiqueta: 'Área del cuadrante', valor: '3,2', unidad: 'km²', ayuda: '' }, { etiqueta: 'Nueva inundación', valor: '1,1', unidad: 'km²', ayuda: '' }],
  tabla: [{ Capa: 'σ⁰ HH · 12/04/2026', Medida: 'Media', Valor: '-6,25 dB', '% del cuadrante': null }],
}

type Llamada = { url: string; metodo: string; cuerpo: any } // eslint-disable-line @typescript-eslint/no-explicit-any
let llamadas: Llamada[]
const json = (x: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(x), { status }))

function simularFetch() {
  llamadas = []
  vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => {
    llamadas.push({ url, metodo: init?.method ?? 'GET', cuerpo: init?.body ? JSON.parse(String(init.body)) : undefined })
    if (url === '/api/salud') return json({ estado: 'ok', hay_sinteticos: true, origen_tipo: 'sintetico', proveedor: 'demo', version: '1' })
    if (url === '/api/escenarios') return json(Object.values(ESCENARIOS))
    if (url === '/api/tipos') return json([{ id: 'humedales', nombre: 'Humedales' }])
    if (url.startsWith('/api/contexto')) return json(null)
    const m = /^\/api\/escenarios\/([^/?]+)(\/.*)?$/.exec(url)
    if (m) {
      if (!m[2]) return json(ESCENARIOS[m[1]])
      if (m[2] === '/cambio') return json(CAMBIOS[m[1]] ?? BASE)
      if (m[2] === '/medicion') return json(JSON.parse(String(init?.body)).cuadrante ? MED_CUADRANTE : MED_PUNTO)
    }
    return json({ mensaje: 'no previsto' }, 404)
  }))
}
const medidas = () => llamadas.filter((l) => l.url.endsWith('/medicion'))
const cambios = () => llamadas.filter((l) => l.url.endsWith('/cambio'))

function Ubicacion() { return <output data-testid="ubicacion">{useLocation().search}</output> }
function montar(ruta = '/observatorio?escenario=ec_x&vista=comparar') {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={cliente}>
      <MemoryRouter initialEntries={[ruta]}><Observatorio /><Ubicacion /></MemoryRouter>
    </QueryClientProvider>,
  )
}
/** Escenario de 200 × 100 px en (0, 0); `gesto` es la capa que recibe los punteros. */
function conLienzo(contenedor: HTMLElement) {
  const esc = contenedor.querySelector('.comparador__escenario') as HTMLElement
  esc.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 100, right: 200, bottom: 100, x: 0, y: 0, toJSON() {} })
  return (contenedor.querySelector('[data-testid="comparador-gesto"], [data-testid="lienzo-gesto"]')) as HTMLElement
}
const clic = (g: HTMLElement, x: number, y: number) => { fireEvent.pointerDown(g, { clientX: x, clientY: y }); fireEvent.pointerUp(g, { clientX: x, clientY: y }) }
const arrastre = (g: HTMLElement, x0: number, y0: number, x1: number, y1: number) => {
  fireEvent.pointerDown(g, { clientX: x0, clientY: y0 }); fireEvent.pointerMove(g, { clientX: x1, clientY: y1 }); fireEvent.pointerUp(g, { clientX: x1, clientY: y1 })
}
async function listo() { return (await screen.findByRole('figure')) as HTMLElement }

beforeEach(() => { stubPointerEvent(); simularFetch() })
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('Observatorio · antes y después', () => {
  it('el comparador usa las fechas elegidas y la polarización elegida', async () => {
    montar('/observatorio?escenario=ec_x&vista=comparar&antes=2026-04-24&despues=2026-05-18&pol=HV')
    const fig = await listo()
    expect(within(fig).getByText('Antes · 24 abr 2026')).toBeInTheDocument()
    expect(within(fig).getByText('Después · 18 may 2026')).toBeInTheDocument()
    expect(within(fig).getByText(/σ⁰ HH, dB|σ⁰ HV, dB/)).toBeInTheDocument()
    expect(cambios()[0].cuerpo).toEqual({ antes: '2026-04-24', despues: '2026-05-18', polarizacion: 'HV' })
    expect(screen.getByLabelText('Polarización')).toHaveValue('HV')
    // «Antes» solo ofrece fechas anteriores a «después»; «después», posteriores a «antes».
    expect(within(screen.getByLabelText('Antes')).getAllByRole('option')).toHaveLength(3)
    expect(within(screen.getByLabelText('Después')).getAllByRole('option')).toHaveLength(2)
    fireEvent.change(screen.getByLabelText('Antes'), { target: { value: '2026-04-12' } })
    expect(screen.getByTestId('ubicacion').textContent).toContain('antes=2026-04-12')
  })

  it('antes = después muestra «Elige dos fechas distintas» y no llama a la API de cambio', async () => {
    montar('/observatorio?escenario=ec_uno&vista=comparar')
    expect(await screen.findByText('Elige dos fechas distintas')).toBeInTheDocument()
    expect(screen.queryByRole('figure')).not.toBeInTheDocument()
    expect(cambios()).toHaveLength(0)
    expect(medidas()).toHaveLength(0)
  })

  it('un error del cambio ofrece Reintentar', async () => {
    vi.stubGlobal('fetch', vi.fn((url: string) => (url.endsWith('/cambio') ? json({ mensaje: 'Falló el cálculo.' }, 422) : json(url === '/api/escenarios/ec_x' ? ESCENARIOS.ec_x : [], 200))))
    montar()
    const alerta = (await screen.findAllByRole('alert')).find((a) => a.textContent?.includes('Falló el cálculo.')) as HTMLElement
    expect(alerta).toHaveTextContent('Falló el cálculo.')
    expect(within(alerta).getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })

  it('el cuadrante muestra KPI y tabla, y el CSV descargado empieza con «# origen»', async () => {
    let contenido: Blob | null = null
    URL.createObjectURL = vi.fn((b: Blob) => { contenido = b; return 'blob:x' })
    URL.revokeObjectURL = vi.fn()
    const clicAncla = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const { container } = montar()
    const g = conLienzo(await listo().then(() => container))
    arrastre(g, 20, 10, 100, 60)
    const tarjeta = (await screen.findByText('Medición en un cuadrante')).closest('section') as HTMLElement
    await within(tarjeta).findByText('Área del cuadrante')
    expect(within(tarjeta).getByText('3,2')).toBeInTheDocument()
    expect(within(tarjeta).getByRole('table', { name: 'Medidas del cuadrante' })).toBeInTheDocument()
    expect(medidas()[0].cuerpo).toEqual({ antes: '2026-04-12', despues: '2026-05-18', cuadrante: [0.1, 0.1, 0.5, 0.6] })
    expect(screen.getByTestId('ubicacion').textContent).toContain('c=0.1%2C0.1%2C0.5%2C0.6')
    fireEvent.click(within(tarjeta).getByRole('button', { name: 'Descargar CSV' }))
    expect(clicAncla).toHaveBeenCalled()
    const texto: string = await new Promise((ok) => { const f = new FileReader(); f.onload = () => ok(String(f.result)); f.readAsText(contenido!) })
    expect(texto.replace(/^\uFEFF/, '').startsWith('# origen: sintético')).toBe(true)
    expect(texto).toContain('Área del cuadrante')
    expect(texto).toContain('DATOS DE DEMOSTRACIÓN')
  })

  it('el punto muestra valores, coordenadas aproximadas y el sello de origen', async () => {
    const { container } = montar()
    const g = conLienzo(await listo().then(() => container))
    clic(g, 100, 50)
        const tarjeta = (await screen.findByText('Medición en un punto')).closest('section') as HTMLElement
    await within(tarjeta).findByText('-4,36 dB')
    expect(within(tarjeta).getByText('-6,73 dB')).toBeInTheDocument()
    // Centro del bbox [-80.24, -0.74, -80.16, -0.66]: 0,700° S, 80,200° O.
    expect(tarjeta).toHaveTextContent(/0,700° S, 80,200° O/)
    expect(medidas()[0].cuerpo).toEqual({ antes: '2026-04-12', despues: '2026-05-18', punto: [0.5, 0.5] })
    expect(within(tarjeta).queryByRole('button', { name: 'Descargar CSV' })).not.toBeInTheDocument()
    expect(within(tarjeta).getByText(/Sintético|demostración/i)).toBeInTheDocument()
  })

  it('«Borrar selección» limpia punto, cuadrante y la URL', async () => {
    const { container } = montar()
    const g = conLienzo(await listo().then(() => container))
    clic(g, 100, 50)
    await screen.findByText('Medición en un punto')
    expect(screen.getByTestId('comparador-punto')).toBeInTheDocument()
    expect(screen.getByTestId('ubicacion').textContent).toContain('p=0.5%2C0.5')
    fireEvent.click(screen.getByRole('button', { name: 'Borrar selección' }))
    expect(screen.queryByTestId('comparador-punto')).not.toBeInTheDocument()
    expect(screen.getByText('Nada seleccionado')).toBeInTheDocument()
    expect(screen.getByTestId('ubicacion').textContent).not.toMatch(/[?&][pc]=/)
    arrastre(g, 20, 10, 100, 60)
    await screen.findByText('Medición en un cuadrante')
    expect(screen.getByTestId('ubicacion').textContent).not.toMatch(/[?&]p=/)
    fireEvent.click(screen.getByRole('button', { name: 'Borrar selección' }))
    expect(screen.queryByTestId('comparador-cuadrante')).not.toBeInTheDocument()
  })

  it('lee la selección de la URL e ignora lo inválido', async () => {
    montar('/observatorio?escenario=ec_x&vista=comparar&p=0.25,0.75&c=basura')
    await screen.findByText('Medición en un punto')
    expect(medidas()[0].cuerpo.punto).toEqual([0.25, 0.75])
    expect(leerPunto('2,3')).toBeNull()
    expect(leerPunto('0.1')).toBeNull()
    expect(leerCuadrante('0.5,0.5,0.2,0.9')).toBeNull()
    expect(leerCuadrante('0.1,0.2,0.3,0.4')).toEqual([0.1, 0.2, 0.3, 0.4])
    expect(textoPunto([0.123456, 0.5])).toBe('0.1235,0.5')
  })

  it('glaciares muestra el campo de flujo con su leyenda y sello', async () => {
    montar('/observatorio?escenario=ec_glaciar&vista=comparar')
    const flujo = (await screen.findByText('Campo de flujo')).closest('section') as HTMLElement
    const lienzo = within(flujo).getByRole('img', { name: /Campo de flujo: 3 flechas/ })
    expect(lienzo.querySelectorAll('line')).toHaveLength(3)
    expect(flujo).toHaveTextContent('0,020 m/día')
    expect(flujo).toHaveTextContent(/demostración|Sintético/i)
    expect(valorRedondo(0.0447)).toBeCloseTo(0.02)
    expect(valorRedondo(0)).toBe(0)
  })

  it('agricultura muestra la tabla por parcela con paginación y CSV', async () => {
    montar('/observatorio?escenario=ec_agri&vista=comparar')
    const tarjeta = (await screen.findByRole('heading', { name: 'Resultados por parcela' })).closest('section') as HTMLElement
    expect(within(tarjeta).getByText('P-1')).toBeInTheDocument()
    expect(within(tarjeta).queryByText('P-60')).not.toBeInTheDocument()
    expect(tarjeta).toHaveTextContent('1–50 de 60')
    expect(within(tarjeta).getByRole('button', { name: 'Descargar CSV' })).toBeInTheDocument()
    expect(within(tarjeta).getAllByRole('columnheader').map((c) => c.textContent)).toEqual(['Parcela', 'Δσ⁰ HV (dB)', 'Cambio detectado'])
  })

  it('las notas del resultado son visibles', async () => {
    montar()
    expect(await screen.findByText('Bajo el dosel inundado, el doble rebote eleva HH.')).toBeInTheDocument()
  })

  it('el PNG del mapa de cambio lleva la franja de demostración', async () => {
    const ops: string[] = []
    const ctx = {
      drawImage: () => ops.push('img'), putImageData: () => {}, fillRect: (...a: number[]) => ops.push(`rect ${a.join(',')}`),
      fillText: (t: string) => ops.push(`texto ${t}`), measureText: (t: string) => ({ width: t.length * 6 }),
      set fillStyle(_v: string) {}, set font(_v: string) {}, set textBaseline(_v: string) {}, set imageSmoothingEnabled(_v: boolean) {},
    }
    const lienzos: HTMLCanvasElement[] = []
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) { lienzos.push(this); return ctx as never })
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((cb) => cb(new Blob(['x'], { type: 'image/png' })))
    URL.createObjectURL = vi.fn(() => 'blob:x')
    URL.revokeObjectURL = vi.fn()
    const clicAncla = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    montar()
    await listo()
    fireEvent.click(screen.getByRole('tab', { name: 'Cambio detectado' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Descargar PNG' }))
    await waitFor(() => expect(clicAncla).toHaveBeenCalled())
    const salida = lienzos[lienzos.length - 1]
    expect(salida.height).toBeGreaterThan(24 + 1) // imagen ampliada + franja
    expect(ops.some((o) => o.startsWith('texto DATOS DE DEMOSTRACIÓN'))).toBe(true)
    expect(ops.some((o) => /^rect 0,\d+,\d+,24$/.test(o))).toBe(true)
  })
})

describe('medicion.ts', () => {
  it('coordenadas aproximadas: y = 0 es el norte', () => {
    const c = coordenadasAprox(BBOX, [0, 0])
    expect(c.lat).toBeCloseTo(-0.66)
    expect(c.lon).toBeCloseTo(-80.24)
    expect(coordenadasAprox(BBOX, [1, 1]).lat).toBeCloseTo(-0.74)
    expect(c.texto).toBe('0,660° S, 80,240° O')
  })
  it('filasCsv pone el resumen antes del detalle y nombreCsv es un nombre seguro', () => {
    const f = filasCsv(MED_CUADRANTE as never)
    expect(f.map((x) => x.Apartado)).toEqual(['Resumen', 'Resumen', 'Detalle'])
    expect(f[0].Valor).toBe('3,2 km²')
    expect(nombreCsv('ec_x~ab/c', '2026-04-12', '2026-05-18')).toBe('medicion_ec_x-ab-c_2026-04-12_a_2026-05-18.csv')
  })
})

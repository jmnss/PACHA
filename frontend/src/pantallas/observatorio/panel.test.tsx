import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Observatorio from './Observatorio'
import { codificar, decodificar, horaATexto, normalizar, textoAHora, type Control } from './parametros'

vi.mock('../../mapa/MapaBase', () => ({
  MapaBase: ({ children }: { children?: ReactNode }) => <div data-testid="mapa-falso">{children}</div>,
}))

const origen = { tipo: 'sintetico', fuente: 'Generador de demostración', generador: 'datos/generador.py', version: '1', semilla: 7, fecha_generacion: '2026-11-04T00:00:00Z' }
const BBOX = [-80.24, -0.74, -80.16, -0.66]
const rejilla = { filas: 2, columnas: 2, vmin: -20, vmax: -2, bbox: BBOX, datos_b64: btoa(String.fromCharCode(1, 80, 160, 255)) }
const fechas = ['2026-04-12', '2026-04-24', '2026-05-06']
const escenario = (id: string, tipo: string, simulacion = true) => ({
  id, nombre: `Escena ${id}`, tipo_cambio: tipo, historia: 'inundacion', region: 'Manabí (Costa)', bbox: BBOX, resolucion_m: 100,
  polarizaciones: ['HH'], variables: ['sigma0'], origen,
  capacidades: { simulacion, modelo_continuo: true, verdad_terreno: true },
  adquisiciones: fechas.map((f) => ({ id: f, instante: `${f}T00:00:00Z`, direccion_orbital: 'Ascendente', polarizaciones: ['HH'] })),
})
const TIPOS = [
  { id: 'humedales', nombre: 'Pérdida de humedales', controles: [
    { id: 'fraccion_inundada', etiqueta: 'Superficie inundada inicial (%)', tipo: 'deslizador', minimo: 10, maximo: 80, paso: 5, valor_defecto: 0.45, escala: 100 },
  ] },
  { id: 'incendios', nombre: 'Incendios forestales', controles: [
    { id: 'radio_km', etiqueta: 'Tamaño final del incendio (km)', tipo: 'deslizador', minimo: 0.5, maximo: 8, paso: 0.5, valor_defecto: 4.5, escala: 1 },
    { id: 'hora_evento', etiqueta: 'Hora de ignición', tipo: 'hora', minimo: 0, maximo: 24, paso: 0.25, valor_defecto: 14, unidad: 'h', escala: 1 },
  ] },
]
const capa = (extra: object) => ({ escenario_id: 'x', adquisicion_id: null, instante: null, polarizacion: null, origen, rejilla, ...extra })
const CAMBIO = {
  antes: capa({ variable: 'sigma0', paleta: 'gris', unidad: 'dB', leyenda: null }), despues: capa({ variable: 'sigma0', paleta: 'gris', unidad: 'dB', leyenda: null }),
  cambio: capa({ variable: 'cambio_de_inundacion', paleta: 'categorias', unidad: '', leyenda: [['Nueva inundación', '#009dcc']] }),
  capas_extra: [], clasificacion: null, notas: [], tablas: [], vectores: null, origen, metricas: [], series: [],
}

type Llamada = { url: string; metodo: string; cuerpo: any } // eslint-disable-line @typescript-eslint/no-explicit-any
let llamadas: Llamada[]
let respuestaSimular: () => Promise<Response>
const json = (x: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(x), { status }))
const posts = () => llamadas.filter((l) => l.metodo === 'POST' && l.url === '/api/simulacion/escenario')

beforeEach(() => {
  llamadas = []
  respuestaSimular = () => json(escenario('ec_x~abc123', 'humedales'))
  vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => {
    llamadas.push({ url, metodo: init?.method ?? 'GET', cuerpo: init?.body ? JSON.parse(String(init.body)) : undefined })
    if (url === '/api/salud') return json({ estado: 'ok', hay_sinteticos: true, origen_tipo: 'sintetico', proveedor: 'demo', version: '1' })
    if (url === '/api/escenarios') return json([escenario('ec_x', 'humedales')])
    if (url === '/api/tipos') return json(TIPOS)
    if (url === '/api/escenarios/ec_x') return json(escenario('ec_x', 'humedales'))
    if (url === '/api/escenarios/ec_x~abc123') return json(escenario('ec_x~abc123', 'humedales'))
    if (url === '/api/escenarios/ec_fuego') return json(escenario('ec_fuego', 'incendios'))
    if (url === '/api/escenarios/ec_real') return json(escenario('ec_real', 'humedales', false))
    if (url === '/api/simulacion/escenario') return respuestaSimular()
    if (url.endsWith('/cambio')) return json(CAMBIO)
    if (url.startsWith('/api/contexto')) return json(null)
    if (url.includes('/capa')) return json(capa({ variable: 'sigma0', paleta: 'gris', unidad: 'dB', leyenda: null }))
    return json({ mensaje: 'no previsto' }, 404)
  }))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers() })

const Ubicacion = () => <output data-testid="ubicacion">{useLocation().search}</output>
function montar(ruta: string) {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={cliente}>
      <MemoryRouter initialEntries={[ruta]}><Observatorio /><Ubicacion /></MemoryRouter>
    </QueryClientProvider>,
  )
}
const panel = () => screen.findByText('Restablecer parámetros')

describe('PanelSimulacion', () => {
  it('solo aparece si el escenario tiene capacidades.simulacion', async () => {
    const a = montar('/observatorio?escenario=ec_real')
    await screen.findByTestId('mapa-falso')
    await screen.findByText(/Cinta de pasadas/)
    expect(screen.queryByText('Parámetros del modelo')).not.toBeInTheDocument()
    expect(screen.queryByText('Restablecer parámetros')).not.toBeInTheDocument()
    a.unmount()
    montar('/observatorio?escenario=ec_x')
    await panel()
    expect(screen.getByText('Parámetros del modelo')).toBeInTheDocument()
  })

  it('incluye semilla, ENL, paso orbital, estacionalidad, fecha del evento y los controles del tipo', async () => {
    montar('/observatorio?escenario=ec_x')
    await panel()
    expect(screen.getByLabelText('Semilla')).toHaveValue(7)
    expect(screen.getByLabelText('Número de miradas (ENL)')).toHaveValue('12')
    expect(screen.getByRole('button', { name: 'ENL' })).toBeInTheDocument()
    expect(screen.getByLabelText('Dirección de la órbita')).toHaveValue('Ascendente')
    expect(screen.getByRole('button', { name: 'Paso orbital' })).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Variación estacional' })).toHaveAttribute('aria-checked', 'true')
    const fecha = screen.getByLabelText('Fecha del evento')
    expect(fecha).toBeEnabled()
    expect(fecha).toHaveAttribute('type', 'date')
    expect(fecha).toHaveAttribute('min', '2024-01-01')
    expect(fecha).toHaveAttribute('max', '2030-12-31')
    // el control del tipo se muestra en las unidades de la interfaz (0,45 × 100 = 45 %)
    expect(screen.getByLabelText('Superficie inundada inicial (%)')).toHaveValue('45')
    expect(screen.getByText('De 10 a 80')).toBeInTheDocument()
    expect(screen.getByText(/mueven el simulador de demostración/)).toBeInTheDocument()
  })

  it('cambiar la fecha del evento pide el escenario con fecha_evento', async () => {
    montar('/observatorio?escenario=ec_x')
    await panel()
    fireEvent.change(screen.getByLabelText('Fecha del evento'), { target: { value: '2026-06-01' } })
    await waitFor(() => expect(posts()).toHaveLength(1), { timeout: 3000 })
    expect(posts()[0].cuerpo).toEqual({ escenario_id: 'ec_x', parametros: { fecha_evento: '2026-06-01' } })
  })

  it('la fecha del evento admite teclear el año: el borrador no se pisa hasta que es válido, y al salir vuelve la vigente', async () => {
    montar('/observatorio?escenario=ec_x')
    await panel()
    const campo = screen.getByLabelText('Fecha del evento') as HTMLInputElement
    fireEvent.change(campo, { target: { value: '0020-06-01' } })
    expect(campo.value).toBe('0020-06-01')
    await new Promise((r) => setTimeout(r, 400))
    expect(posts()).toHaveLength(0)
    fireEvent.blur(campo)
    expect(campo.value).not.toBe('0020-06-01')
    fireEvent.change(campo, { target: { value: '2026-06-01' } })
    expect(campo.value).toBe('2026-06-01')
    await waitFor(() => expect(posts()).toHaveLength(1), { timeout: 3000 })
  })

  it('incluye el control de hora de los incendios', async () => {
    montar('/observatorio?escenario=ec_fuego')
    await panel()
    const hora = screen.getByLabelText('Hora de ignición')
    expect(hora).toHaveValue('14:00')
    expect(screen.getByLabelText('Tamaño final del incendio (km)')).toBeInTheDocument()
  })

  describe('con temporizadores falsos', () => {
    // Se activan tras el primer render (react-query y waitFor necesitan el reloj real al cargar).
    const falsos = () => vi.useFakeTimers()

    it('varios cambios seguidos hacen una sola petición, 300 ms después de la última', async () => {
      montar('/observatorio?escenario=ec_x')
      await panel()
      falsos()
      const ENL = screen.getByLabelText('Número de miradas (ENL)')
      fireEvent.change(ENL, { target: { value: '20' } })
      await act(() => vi.advanceTimersByTimeAsync(200))
      fireEvent.change(ENL, { target: { value: '30' } })
      await act(() => vi.advanceTimersByTimeAsync(200))
      fireEvent.change(ENL, { target: { value: '40' } })
      expect(screen.getByText(/Calculando…/)).toBeInTheDocument()
      await act(() => vi.advanceTimersByTimeAsync(299))
      expect(posts()).toHaveLength(0)
      await act(() => vi.advanceTimersByTimeAsync(5))
      await act(() => vi.advanceTimersByTimeAsync(50))
      expect(posts()).toHaveLength(1)
      expect(posts()[0].cuerpo).toEqual({ escenario_id: 'ec_x', parametros: { looks: 40 } })
      await act(() => vi.advanceTimersByTimeAsync(50))
      expect(screen.getByTestId('ubicacion').textContent).toContain('escenario=ec_x%7Eabc123')
      expect(decodificar(new URLSearchParams(screen.getByTestId('ubicacion').textContent!).get('par')!, [])).toEqual({ looks: 40 })
    })

    it('mientras calcula muestra el tiempo transcurrido y desactiva el reproductor con su motivo', async () => {
      let resolver: (r: Response) => void = () => {}
      respuestaSimular = () => new Promise<Response>((r) => { resolver = r })
      montar('/observatorio?escenario=ec_x')
      await panel()
      falsos()
      fireEvent.click(screen.getByRole('switch', { name: 'Variación estacional' }))
      await act(() => vi.advanceTimersByTimeAsync(300))
      await act(() => vi.advanceTimersByTimeAsync(2000))
      expect(screen.getByText(/Calculando… [12] s/)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Ir al inicio' })).toBeDisabled()
      expect(screen.getByText(/Se está calculando un escenario nuevo/)).toBeInTheDocument()
      await act(async () => { resolver(new Response(JSON.stringify(escenario('ec_x~abc123', 'humedales')))) })
      await act(() => vi.advanceTimersByTimeAsync(100))
      expect(screen.queryByText(/Calculando…/)).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Ir al inicio' })).toBeEnabled()
    })

    it('un error 422 del servidor se ve en español dentro del panel', async () => {
      respuestaSimular = () => json({ mensaje: 'looks debe estar entre 1 y 100.' }, 422)
      montar('/observatorio?escenario=ec_x')
      await panel()
      falsos()
      fireEvent.change(screen.getByLabelText('Número de miradas (ENL)'), { target: { value: '50' } })
      await act(() => vi.advanceTimersByTimeAsync(350))
      await act(() => vi.advanceTimersByTimeAsync(50))
      expect(screen.getByText('looks debe estar entre 1 y 100.')).toBeInTheDocument()
      expect(screen.getByRole('alert')).toHaveTextContent('looks debe estar entre 1 y 100.')
    })
  })

  it('restablecer vuelve a los valores por defecto y al escenario base', async () => {
    const par = codificar({ looks: 40, orbita: 'Descendente', fraccion_inundada: 60 })
    montar(`/observatorio?escenario=ec_x%7Eabc123&par=${par}`)
    await panel()
    expect(screen.getByLabelText('Número de miradas (ENL)')).toHaveValue('40')
    expect(screen.getByLabelText('Dirección de la órbita')).toHaveValue('Descendente')
    expect(screen.getByLabelText('Superficie inundada inicial (%)')).toHaveValue('60')
    fireEvent.click(screen.getByText('Restablecer parámetros'))
    await waitFor(() => expect(screen.getByTestId('ubicacion').textContent).toBe('?escenario=ec_x'))
    await panel()
    expect(screen.getByLabelText('Número de miradas (ENL)')).toHaveValue('12')
    expect(screen.getByLabelText('Dirección de la órbita')).toHaveValue('Ascendente')
    expect(screen.getByLabelText('Superficie inundada inicial (%)')).toHaveValue('45')
    expect(posts()).toHaveLength(0)
  })

  it('un par= inválido o fuera de rango se ignora', async () => {
    montar(`/observatorio?escenario=ec_x&par=${codificar({ looks: 9999 })}`)
    await panel()
    expect(screen.getByLabelText('Número de miradas (ENL)')).toHaveValue('12')
    cleanup()
    montar('/observatorio?escenario=ec_x&par=%%%basura')
    await panel()
    expect(screen.getByLabelText('Semilla')).toHaveValue(7)
  })

  const movilSim = () => vi.stubGlobal('matchMedia', (q: string) => ({ matches: true, media: q, addEventListener: () => {}, removeEventListener: () => {} }))

  it('en móvil el panel abre como hoja inferior desde el menú y se cierra con Escape devolviendo el foco al menú', async () => {
    movilSim()
    montar('/observatorio?escenario=ec_x&vista=comparar')
    await screen.findByText(/Cinta de pasadas|Antes y después/)
    expect(screen.queryByText('Restablecer parámetros')).not.toBeInTheDocument()
    const menu = await screen.findByRole('button', { name: 'Más acciones' })
    menu.focus()
    fireEvent.click(menu)
    fireEvent.click(screen.getByRole('menuitem', { name: 'Parámetros del modelo' }))
    const hoja = await screen.findByRole('dialog', { name: 'Parámetros del modelo' })
    expect(hoja).toHaveAttribute('aria-modal', 'true')
    expect(within(hoja).getByText('Restablecer parámetros')).toBeInTheDocument()
    fireEvent.keyDown(hoja, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(menu).toHaveFocus()
    fireEvent.click(menu)
    fireEvent.click(screen.getByRole('menuitem', { name: 'Parámetros del modelo' }))
    const otra = await screen.findByRole('dialog')
    fireEvent.click(within(otra).getByRole('button', { name: 'Cerrar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('en móvil el menú de la vista mapa alterna «Ver todo Ecuador» y la barra ya no tiene esos botones', async () => {
    movilSim()
    montar('/observatorio?escenario=ec_x')
    await screen.findByText(/Cinta de pasadas/)
    expect(screen.queryByRole('button', { name: 'Ver todo Ecuador' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Parámetros del modelo' })).not.toBeInTheDocument()
    fireEvent.click(await screen.findByRole('button', { name: 'Más acciones' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Ver todo Ecuador' }))
    fireEvent.click(screen.getByRole('button', { name: 'Más acciones' }))
    expect(screen.getByRole('menuitem', { name: 'Ver el escenario' })).toBeInTheDocument()
  })

  it('sin capacidad de simulación el menú no ofrece «Parámetros del modelo»', async () => {
    movilSim()
    montar('/observatorio?escenario=ec_x')
    await screen.findByText(/Cinta de pasadas/)
    fireEvent.click(await screen.findByRole('button', { name: 'Más acciones' }))
    expect(screen.getByRole('menuitem', { name: 'Parámetros del modelo' })).toBeInTheDocument()
    cleanup()
    montar('/observatorio?escenario=ec_real')
    await screen.findByText(/Cinta de pasadas/)
    fireEvent.click(await screen.findByRole('button', { name: 'Más acciones' }))
    expect(screen.queryByRole('menuitem', { name: 'Parámetros del modelo' })).not.toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Ver todo Ecuador' })).not.toHaveAttribute('aria-pressed')
  })

  it('en escritorio no hay menú y los botones siguen en la barra del mapa', async () => {
    montar('/observatorio?escenario=ec_x')
    await screen.findByText(/Cinta de pasadas/)
    expect(screen.queryByRole('button', { name: 'Más acciones' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ver todo Ecuador' })).toBeInTheDocument()
  })
})

describe('parámetros en la URL', () => {
  const controles = TIPOS[0].controles as unknown as Control[]
  it('valida la fecha del evento', () => {
    expect(normalizar({ fecha_evento: '2026-06-01' }, [])).toEqual({ fecha_evento: '2026-06-01' })
    for (const mala of ['2023-12-31', '2031-01-01', '2026-02-30', '01/06/2026', 20260601]) {
      expect(normalizar({ fecha_evento: mala } as never, [])).toEqual({})
    }
  })
  it('ida y vuelta, y descarta lo desconocido o fuera de rango', () => {
    const v = { looks: 30, orbita: 'Descendente', estacional: false, semilla: 99, fraccion_inundada: 60 }
    expect(decodificar(codificar(v), controles)).toEqual(v)
    expect(decodificar(codificar({ looks: 0, inventado: 1, fraccion_inundada: 99, lat: -1 } as never), controles)).toEqual({})
    expect(decodificar(codificar({ looks: 12, fraccion_inundada: 45 }), controles)).toEqual({})
    expect(codificar({})).toBe('')
  })
  it('convierte la hora decimal', () => {
    expect(horaATexto(6.4)).toBe('06:24')
    expect(textoAHora('14:15')).toBe(14.25)
    expect(textoAHora('24:00')).toBeNull()
  })
})

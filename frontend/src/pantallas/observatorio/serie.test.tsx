import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Observatorio from './Observatorio'
import { renderConIdioma, renderPseudo, textosSinTraducir } from '../../idioma/pruebas'

vi.mock('../../mapa/MapaBase', () => ({ MapaBase: ({ children }: { children?: ReactNode }) => <div>{children}</div> }))

const origen = (tipo: string) => ({ tipo, fuente: tipo === 'real' ? 'Fuente oficial' : 'Generador de demostración', generador: 'datos/generador.py', version: '1', semilla: 7, fecha_generacion: '2026-11-04T00:00:00Z' })
const BBOX = [-80.24, -0.74, -80.16, -0.66]
const fechas = ['2026-04-12', '2026-04-24', '2026-05-06', '2026-05-18']
const escenario = (id: string) => ({
  instante_evento: '2026-05-06T15:30:00Z', id, nombre: `Escenario ${id}`, tipo_cambio: 'humedales', historia: 'inundacion', region: 'Costa', bbox: BBOX, resolucion_m: 100,
  polarizaciones: ['HH'], variables: ['sigma0'], origen: origen('sintetico'),
  capacidades: { simulacion: true, modelo_continuo: true, verdad_terreno: true },
  adquisiciones: fechas.map((f) => ({ id: f, instante: `${f}T00:00:00Z`, direccion_orbital: 'Ascendente', polarizaciones: ['HH'] })),
})
const rejilla = { filas: 1, columnas: 1, vmin: 0, vmax: 1, bbox: BBOX, datos_b64: btoa(String.fromCharCode(1)) }
const capa = { escenario_id: 'x', adquisicion_id: null, instante: null, polarizacion: 'HH', origen: origen('sintetico'), rejilla, variable: 'sigma0', paleta: 'gris', unidad: 'dB', leyenda: null }
const serie = (titulo: string, tipo: string, nombres: string[]) => ({
  titulo, unidad: 'km²', origen: origen(tipo),
  puntos: nombres.flatMap((n, k) => fechas.map((f, i) => [`${f}T00:00:00Z`, 10 + i + k * 0.5, n])),
})
const cambio = (series: object[], tipo = 'sintetico') => ({
  antes: capa, despues: capa, cambio: capa, capas_extra: [], clasificacion: null, tablas: [], vectores: null, origen: origen(tipo),
  notas: ['Bajo el dosel inundado, el doble rebote eleva HH.'], metricas: [], series,
})
let respuesta: object
let seleccion: object | null
const json = (x: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(x), { status }))

beforeEach(() => {
  respuesta = cambio([serie('Superficie inundada', 'sintetico', ['Estimada', 'Verdad sintética']), serie('Humedad del suelo', 'sintetico', ['Estimada'])])
  seleccion = serie('Superficie inundada', 'sintetico', ['Punto'])
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    if (url === '/api/salud') return json({ estado: 'ok', hay_sinteticos: true, origen_tipo: 'sintetico', proveedor: 'demo', version: '1' })
    if (url === '/api/escenarios') return json([escenario('ec_x')])
    if (url === '/api/tipos') return json([{ id: 'humedales', nombre: 'Humedales' }])
    if (url.startsWith('/api/contexto')) return json(null)
    if (url === '/api/escenarios/ec_x') return json(escenario('ec_x'))
    if (url === '/api/escenarios/ec_x/cambio') return json(respuesta)
    if (url.startsWith('/api/escenarios/ec_x/serie-seleccion')) return json(seleccion)
    return json({ mensaje: 'no previsto' }, 404)
  }))
})
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

function montar(ruta = '/explorar/observatorio?escenario=ec_x&vista=serie&antes=2026-04-24&despues=2026-05-18') {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={cliente}>
      <MemoryRouter initialEntries={[ruta]}><Observatorio /></MemoryRouter>
    </QueryClientProvider>,
  )
}
const leer = (b: Blob): Promise<string> => new Promise((ok) => { const f = new FileReader(); f.onload = () => ok(String(f.result)); f.readAsText(b) })

describe('Observatorio · series', () => {
  it('un gráfico por serie con las marcas antes y después', async () => {
    montar()
    const figuras = await screen.findAllByRole('figure')
    expect(figuras).toHaveLength(2)
    const etiquetas = (f: HTMLElement) => [...f.querySelectorAll('.grafico__marca text')].map((t) => t.textContent)
    expect(etiquetas(figuras[0])).toEqual(['antes', 'Evento', 'después'])
    expect(figuras[0].querySelector('.grafico__marca--antes')).not.toBeNull()
    expect(figuras[0].querySelector('.grafico__marca--despues')).not.toBeNull()
    expect(within(figuras[0]).getByRole('img').getAttribute('aria-label')).toContain('Marcas: antes (24 abr 2026), Evento (6 may 2026), después (18 may 2026)')
    expect(screen.getByRole('heading', { name: 'Superficie inundada' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Humedad del suelo' })).toBeInTheDocument()
    expect(screen.getByText(/Bajo el dosel inundado/)).toBeInTheDocument()
  })

  it('tabla y CSV por serie con origen', async () => {
    let contenido: Blob | null = null
    let nombre = ''
    URL.createObjectURL = vi.fn((b: Blob) => { contenido = b; return 'blob:x' })
    URL.revokeObjectURL = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { nombre = this.download })
    montar()
    const tabla = await screen.findByRole('table', { name: 'Valores de Humedad del suelo' })
    expect(within(tabla).getAllByRole('columnheader').map((c) => c.textContent)).toEqual(['Fecha', 'Valor (km²)', 'Serie'])
    expect(within(tabla).getAllByRole('row')).toHaveLength(5)
    const tarjeta = tabla.closest('section') as HTMLElement
    fireEvent.click(within(tarjeta).getByRole('button', { name: 'Descargar CSV' }))
    await waitFor(() => expect(contenido).not.toBeNull())
    const texto = (await leer(contenido!)).replace(/^\uFEFF/, '')
    expect(texto.startsWith('# origen: sintético')).toBe(true)
    expect(texto).toContain('DATOS DE DEMOSTRACIÓN')
    expect(texto).toContain('Fecha,Valor (km²),Serie')
    expect(texto).toContain('12 abr 2026,10,Estimada')
    expect(nombre).toBe('serie_ec-x_humedad-del-suelo.csv')
  })

  it('la verdad sintética se rotula como tal', async () => {
    montar()
    const [fig] = await screen.findAllByRole('figure')
    expect(within(fig).getByText('verdad sintética')).toBeInTheDocument()
    expect(fig.querySelector('path[data-serie="verdad sintética"]')?.getAttribute('stroke-dasharray')).toBe('4 4')
    expect(screen.getByText(/La línea punteada es la verdad sintética/)).toBeInTheDocument()
    expect(screen.getAllByText('verdad sintética').length).toBeGreaterThan(1) // leyenda y columna «Serie»
  })

  it('con origen real no se rotula «verdad sintética»', async () => {
    respuesta = cambio([serie('Superficie inundada', 'real', ['Estimada', 'Verdad de campo'])], 'real')
    montar()
    const fig = await screen.findByRole('figure')
    expect(screen.queryByText('verdad sintética')).not.toBeInTheDocument()
    expect(screen.queryByText(/verdad sintética/i)).not.toBeInTheDocument()
    expect(within(fig).getByText('Verdad de campo')).toBeInTheDocument()
  })

  it('sin series explica el motivo y un error ofrece Reintentar', async () => {
    respuesta = cambio([])
    const { unmount } = montar()
    expect(await screen.findByText('Este escenario no tiene series de tiempo. Prueba la vista Mapa u otro escenario.')).toBeInTheDocument()
    unmount()
    vi.stubGlobal('fetch', vi.fn((url: string) => (url.endsWith('/cambio') ? json({ mensaje: 'Falló el cálculo.' }, 422) : json(url === '/api/escenarios/ec_x' ? escenario('ec_x') : url.startsWith('/api/contexto') ? null : [], 200))))
    montar()
    const alerta = (await screen.findAllByRole('alert')).find((a) => a.textContent?.includes('Falló el cálculo.')) as HTMLElement
    expect(within(alerta).getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })
})

describe('Observatorio · series · idioma', () => {
  const envolver = (render: typeof renderPseudo) => {
    const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    return render(
      <QueryClientProvider client={cliente}>
        <MemoryRouter initialEntries={['/explorar/observatorio?escenario=ec_x&vista=serie&antes=2026-04-24&despues=2026-05-18']}><Observatorio /></MemoryRouter>
      </QueryClientProvider>,
    )
  }
  // Nombres de serie y de escenario, y títulos, que vienen de la API y los mocks.
  const API = ['Estimada', 'Humedales', 'Superficie inundada', 'Humedad del suelo', 'Bajo el dosel inundado, el doble rebote eleva HH.', 'Valores de Superficie inundada', 'Valores de Humedad del suelo']

  it('la vista «serie» pasa por el traductor', async () => {
    const { container } = envolver(renderPseudo)
    await screen.findAllByRole('figure')
    const sin = textosSinTraducir(container).filter((x) => !API.includes(x) && !/^Escenario ec_|^\d+ \w+ \d{4}$|^[A-Z][a-z]{2} \d{1,2}$/.test(x))
    expect(sin).toEqual([])
  })

  it('en inglés las cabeceras y el CSV de la serie salen en inglés, con las líneas de máquina en español', async () => {
    let contenido: Blob | null = null
    URL.createObjectURL = vi.fn((b: Blob) => { contenido = b; return 'blob:x' })
    URL.revokeObjectURL = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    envolver((ui) => renderConIdioma(ui, 'en'))
    const tabla = await screen.findByRole('table', { name: 'Values of Humedad del suelo' })
    expect(within(tabla).getAllByRole('columnheader').map((c) => c.textContent)).toEqual(['Date', 'Value (km²)', 'Series'])
    fireEvent.click(within(tabla.closest('section') as HTMLElement).getByRole('button', { name: 'Download CSV' }))
    await waitFor(() => expect(contenido).not.toBeNull())
    const texto = (await leer(contenido!)).replace(/^\uFEFF/, '')
    expect(texto.startsWith('# origen: sintético')).toBe(true)
    expect(texto).toContain('# idioma: en')
    expect(texto).toContain('Date,Value (km²),Series')
    expect(texto).toContain('12 Apr 2026,10,Estimada')
  })

  it('en inglés el nombre de cada línea sale de nombres_texto y la verdad sintética conserva su rótulo', async () => {
    respuesta = cambio([{
      ...serie('Superficie inundada', 'sintetico', ['Zona quemada', 'Verdad del modelo', 'Nombre nuevo']),
      nombres_texto: {
        'Zona quemada': { clave_texto: 'api.obs.serie_nombre.zona_quemada', valores_texto: {}, decimales_texto: {} },
        'Verdad del modelo': { clave_texto: 'api.obs.serie_nombre.verdad_del_modelo', valores_texto: {}, decimales_texto: {} },
      },
    }])
    envolver((ui) => renderConIdioma(ui, 'en'))
    const tabla = await screen.findByRole('table', { name: 'Values of Superficie inundada' })
    expect(within(tabla).getAllByText('Burned zone').length).toBeGreaterThan(0)
    expect(within(tabla).getAllByText('Nombre nuevo')[0]).toHaveAttribute('lang', 'es')
    expect(within(tabla).queryByText('Zona quemada')).toBeNull()
  })

  it('con un punto muestra primero «En la selección» con gráfica, tabla, CSV y aviso de polarización', async () => {
    let contenido: Blob | null = null
    let nombre = ''
    URL.createObjectURL = vi.fn((b: Blob) => { contenido = b; return 'blob:x' })
    URL.revokeObjectURL = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { nombre = this.download })
    montar('/explorar/observatorio?escenario=ec_x&vista=serie&antes=2026-04-24&despues=2026-05-18&p=0.5,0.5')
    await waitFor(() => expect(screen.getAllByRole('figure')).toHaveLength(3))
    const tarjeta = screen.getByRole('heading', { name: 'En la selección' }).closest('section') as HTMLElement
    expect(within(tarjeta).getByRole('figure')).toBeInTheDocument()
    expect(within(tarjeta).getByRole('table')).toBeInTheDocument()
    fireEvent.click(within(tarjeta).getByRole('button', { name: 'Descargar CSV' }))
    await waitFor(() => expect(contenido).not.toBeNull())
    const csv = (await leer(contenido!)).replace(/^\uFEFF/, '')
    expect(csv.startsWith('# origen: sintético')).toBe(true)
    expect(csv).toContain('DATOS DE DEMOSTRACIÓN')
    expect(nombre).toBe('serie_ec-x_seleccion.csv')
    expect(tarjeta).toHaveTextContent('La serie usa la polarización del observable del tipo, no la del selector.')
    const titulos = screen.getAllByRole('heading').map((h) => h.textContent)
    expect(titulos.indexOf('En la selección')).toBeLessThan(titulos.indexOf('Humedad del suelo'))
    const llamada = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0] as string).find((u) => u.includes('serie-seleccion'))
    expect(llamada).toContain('punto=0.5')
  })

  it('una selección sin puntos dice «Sin dato en la selección»', async () => {
    seleccion = { ...serie('Superficie inundada', 'sintetico', []), puntos: [] }
    montar('/explorar/observatorio?escenario=ec_x&vista=serie&antes=2026-04-24&despues=2026-05-18&c=0.1,0.1,0.5,0.5')
    expect(await screen.findByText('Sin dato en la selección')).toBeInTheDocument()
    expect(screen.getByText('Ese punto cae en agua o donde el radar no midió. Toca otro punto.')).toBeInTheDocument()
  })

  it('sin punto ni cuadrante no se llama a la API de selección', async () => {
    montar()
    await screen.findAllByRole('figure')
    const urls = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0] as string)
    expect(urls.some((u) => u.includes('serie-seleccion'))).toBe(false)
    expect(screen.queryByText('En la selección')).not.toBeInTheDocument()
  })

  it('la serie marca el evento y el instante de la cinta', async () => {
    montar()
    const [fig] = await screen.findAllByRole('figure')
    expect(within(fig).getByRole('img').getAttribute('aria-label')).toContain('Evento (6 may 2026)')
    expect(fig.querySelector('.grafico__marca--evento')).not.toBeNull()
    expect(fig.querySelector('line.grafico__cursor')).not.toBeNull()
  })
})

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Laboratorio from './Laboratorio'
import { renderConIdioma, renderPseudo, textosSinTraducir } from '../../idioma/pruebas'

const origen = { tipo: 'sintetico', fuente: 'Laboratorio del radar', generador: 'datos/laboratorio.py', version: '1', semilla: 11, fecha_generacion: '2026-11-01T00:00:00Z' }
const rejilla = { filas: 2, columnas: 2, vmin: 0, vmax: 4, bbox: [-80.1, -2.1, -79.9, -1.9], datos_b64: btoa(String.fromCharCode(1, 2, 3, 4)) }
const capa = (variable: string, paleta = 'gris', leyenda: [string, string][] | null = null) =>
  ({ escenario_id: 'laboratorio', adquisicion_id: null, instante: null, polarizacion: null, origen, rejilla, variable, paleta, unidad: '', leyenda })
const LEY: [string, string][] = [['A', '#000'], ['B', '#000'], ['C', '#000'], ['D', '#000']]
const metrica = (etiqueta: string, valor: string) => ({ etiqueta, valor, unidad: '%', ayuda: '' })
const NUBES = {
  optico: capa('reflectancia'), radar: capa('sigma0'), cambio_optico: capa('clasificacion_optico', 'categorias', LEY), cambio_radar: capa('clasificacion_radar', 'categorias', LEY),
  metricas: [metrica('Cambio visto por el radar', '94'), metrica('Cambio visto por el óptico', '25'), metrica('Tapado por nubes', '60')],
  porcentaje_radar: 94, porcentaje_optico: 25, cobertura_real: 0.6, origen,
}
const RESPUESTA = {
  banda: 'S', pol: 'HH', capa: capa('sigma0'), superficies: capa('superficies', 'categorias', LEY),
  respuestas: [{ superficie: 'Bosque', pol: 'HH', db: -9 }, { superficie: 'Agua', pol: 'HH', db: -20 }],
  cambios: [{ cambio: 'Quema del bosque', mejor_pol: 'HV', contraste_db: 3, contrastes: { HH: 1, HV: 3, VV: 0 } }],
  aviso_banda: 'Banda S: ejemplo ilustrativo; pendiente de confirmar con la documentación oficial.', origen,
}
const json = (x: unknown) => Promise.resolve(new Response(JSON.stringify(x)))
let urls: string[]
beforeEach(() => {
  urls = []
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    urls.push(url)
    if (url.startsWith('/api/laboratorio/nubes')) return json(NUBES)
    if (url.startsWith('/api/laboratorio/respuesta')) return json(RESPUESTA)
    return json({ estado: 'ok', hay_sinteticos: true, origen_tipo: 'sintetico', proveedor: 'demo', version: '1' })
  }))
})
afterEach(() => vi.unstubAllGlobals())

const montar = (ruta: string) => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter initialEntries={[ruta]}><Laboratorio /></MemoryRouter>
  </QueryClientProvider>)

describe('Laboratorio', () => {
  it('muestra el experimento de nubes con el radar por encima del óptico', async () => {
    montar('/laboratorio?nubes=60')
    expect(await screen.findByText('Cambio visto por el radar')).toBeInTheDocument()
    expect(urls.some((u) => u.endsWith('cobertura=60'))).toBe(true)
    expect(screen.getAllByText(/sintético/i).length).toBeGreaterThan(0)
  })

  it('el deslizador pide otra cobertura', async () => {
    montar('/laboratorio')
    const d = await screen.findByLabelText(/Cobertura de nubes/)
    fireEvent.change(d, { target: { value: '30' } })
    await waitFor(() => expect(urls.some((u) => u.endsWith('cobertura=30'))).toBe(true))
  })

  it('la vista de polarización avisa de que la banda S está pendiente de confirmar', async () => {
    montar('/laboratorio?vista=polarizacion&banda=S')
    expect(await screen.findByText(/pendiente de confirmar/)).toBeInTheDocument()
    expect(screen.getByText('Quema del bosque')).toBeInTheDocument()
  })

  it('renderPseudo no deja texto de interfaz sin traducir en la vista de nubes', async () => {
    const { container } = renderPseudo(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter initialEntries={['/laboratorio']}><Laboratorio /></MemoryRouter></QueryClientProvider>)
    await screen.findByText(/Cambio visto por el radar/)
    expect(textosSinTraducir(container)).toEqual([])
  })

  it('renderPseudo no deja texto de interfaz sin traducir en la vista de polarización', async () => {
    const { container } = renderPseudo(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter initialEntries={['/laboratorio?vista=polarizacion&banda=S']}><Laboratorio /></MemoryRouter></QueryClientProvider>)
    await screen.findByText('⟦Quema del bosque⟧')
    expect(textosSinTraducir(container)).toEqual([])
  })

  it.each([['es', /pendiente de confirmar/, 'Quema del bosque'], ['en', /pending confirmation/, 'Forest burning'], ['qu', /shuyan/, 'Sachapa rupay']] as const)('la banda S queda marcada como pendiente en %s', async (idioma, patron, cambio) => {
    renderConIdioma(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter initialEntries={['/laboratorio?vista=polarizacion&banda=S']}><Laboratorio /></MemoryRouter></QueryClientProvider>, idioma)
    await screen.findByText(cambio)
    expect(screen.getByText(patron)).toBeInTheDocument()
  })
})

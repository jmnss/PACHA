import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, renderHook, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProveedorIdioma } from '../idioma/ProveedorIdioma'
import Recorrido from '../pantallas/recorrido/Recorrido'
import { GUION } from '../pantallas/recorrido/guion'
import Simulador from '../pantallas/simulador/Simulador'
import { INCENDIO, MUNDO } from '../pantallas/simulador/fixtures'
import { usePlayback } from '../tiempo/usePlayback'
import { useMenosMovimiento } from './useMenosMovimiento'

let oyentes: Array<() => void> = []
let reducido = true
function menosMovimiento(valor: boolean) {
  reducido = valor
  oyentes = []
  vi.stubGlobal('matchMedia', (q: string) => ({
    get matches() { return reducido && q.includes('reduce') }, media: q,
    addEventListener: (_: string, f: () => void) => { oyentes.push(f) }, removeEventListener() {},
    addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false,
  }))
}

const RES = vi.hoisted(() => ({} as Record<string, unknown>))
vi.mock('../api/simulador', () => ({
  useCatalogo: () => RES.catalogo,
  useMundo: () => RES.mundo,
  useEvento: () => RES.evento,
  fundarCiudad: () => Promise.resolve({}),
}))
vi.mock('../pantallas/simulador/Tablero', () => ({ Tablero: () => <div /> }))
vi.mock('../pantallas/simulador/ResultadosEvento', () => ({ ResultadosEvento: () => <div /> }))
vi.mock('../pantallas/simulador/PanelHerramienta', () => ({ PanelHerramienta: () => <div /> }))
vi.mock('../pantallas/simulador/PanelMundo', () => ({ PanelMundo: () => <div /> }))

beforeEach(() => {
  vi.useFakeTimers(); menosMovimiento(true)
  RES.catalogo = { data: { extensiones_km: [30], mundos: [], herramientas: [{ id: 'incendio', icono: '', nombre: 'Incendio', controles: [] }] }, isError: false, refetch: () => {} }
  RES.mundo = { data: MUNDO, isPending: false, isError: false, refetch: () => {} }
  RES.evento = { data: INCENDIO, isFetching: false, isError: false, refetch: () => {} }
})
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

describe('menos movimiento', () => {
  it('el hook lee la preferencia y reacciona a los cambios', () => {
    const { result } = renderHook(() => useMenosMovimiento())
    expect(result.current).toBe(true)
    reducido = false
    act(() => oyentes.forEach((f) => f()))
    expect(result.current).toBe(false)
  })

  it('sin matchMedia el hook es falso', () => {
    vi.stubGlobal('matchMedia', undefined)
    expect(renderHook(() => useMenosMovimiento()).result.current).toBe(false)
  })

  it('el reproductor no arranca solo: play avanza un paso', () => {
    const { result } = renderHook(() => usePlayback({ total: 4, intervaloMs: 100 }))
    act(() => result.current.play())
    expect(result.current.reproduciendo).toBe(false)
    expect(result.current.indice).toBe(1)
    act(() => { vi.advanceTimersByTime(1000) })
    expect(result.current.indice).toBe(1)
  })

  it('el recorrido no avanza solo', () => {
    render(<MemoryRouter initialEntries={['/recorrido']}><Recorrido /></MemoryRouter>)
    act(() => { vi.advanceTimersByTime(GUION[0].segundos * 3000) })
    expect(screen.getByText(GUION[0].titulo)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reanudar' })).toBeInTheDocument()
  })

  it('el simulador muestra el último fotograma y deja el botón Reproducir', () => {
    render(<QueryClientProvider client={new QueryClient()}><ProveedorIdioma inicial="es"><MemoryRouter initialEntries={['/simulador?h=incendio&i=60&j=60']}><Simulador /></MemoryRouter></ProveedorIdioma></QueryClientProvider>)
    expect(screen.getByRole('button', { name: 'Reproducir' })).toBeInTheDocument()
    expect(screen.getByRole('slider', { name: /instante/i })).toHaveValue(String(INCENDIO.cuadros_png_b64.length - 1))
  })
})

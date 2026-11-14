import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Catalogo, Herramienta } from '../../api/simulador'
import { ProveedorIdioma } from '../../idioma/ProveedorIdioma'
import { MUNDO } from './fixtures'
import Simulador from './Simulador'

const H = { id: 'incendio', icono: '', nombre: 'Incendio', controles: [] } as unknown as Herramienta
const CATALOGO = { extensiones_km: [20, 30], herramientas: [H], mundos: [] } as unknown as Catalogo

vi.mock('../../api/simulador', async (original) => ({
  ...(await original<typeof import('../../api/simulador')>()),
  useCatalogo: () => ({ data: CATALOGO, isError: false }),
  useMundo: () => ({ data: MUNDO, isPending: false, isError: false, isFetching: false }),
  useEvento: () => ({ data: undefined, isFetching: false, isError: false }),
}))
vi.mock('./Tablero', () => ({ Tablero: () => <div data-testid="tablero" /> }))

afterEach(() => vi.unstubAllGlobals())

function montar() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <ProveedorIdioma inicial="es">
        <MemoryRouter initialEntries={['/simulador']}><Simulador /></MemoryRouter>
      </ProveedorIdioma>
    </QueryClientProvider>,
  )
}
const posicion = () => {
  const mundo = screen.getByRole('heading', { name: 'Mundo' }).closest('.tarjeta')!
  const tablero = screen.getByRole('heading', { name: 'Tablero' }).closest('.tarjeta')!
  return { mundo, tablero }
}

describe('Simulador · orden en móvil', () => {
  it('en móvil la tarjeta «Mundo» va antes que el tablero', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: true, media: q, addEventListener: () => {}, removeEventListener: () => {} }))
    montar()
    const { mundo, tablero } = posicion()
    expect(mundo.compareDocumentPosition(tablero) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('en escritorio la tarjeta «Mundo» va después del tablero', () => {
    montar()
    const { mundo, tablero } = posicion()
    expect(tablero.compareDocumentPosition(mundo) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})

describe('Simulador · borrador del mundo', () => {
  it('al cruzar 700 px (cambia el orden y se remonta PanelMundo) el borrador sobrevive', () => {
    const oyentes = new Set<() => void>()
    let movil = false
    vi.stubGlobal('matchMedia', (q: string) => ({
      get matches() { return movil }, media: q,
      addEventListener: (_: string, f: () => void) => oyentes.add(f), removeEventListener: (_: string, f: () => void) => oyentes.delete(f),
    }))
    montar()
    fireEvent.change(screen.getByLabelText('Latitud'), { target: { value: '-1.23' } })
    expect(screen.getByLabelText('Latitud')).toHaveValue(-1.23)
    act(() => { movil = true; oyentes.forEach((f) => f()) })
    expect(screen.getByLabelText('Latitud')).toHaveValue(-1.23)
  })
})

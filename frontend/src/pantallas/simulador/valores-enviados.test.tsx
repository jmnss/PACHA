import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { Catalogo, Herramienta, PeticionEvento } from '../../api/simulador'
import { ProveedorIdioma } from '../../idioma/ProveedorIdioma'
import { MUNDO } from './fixtures'
import Simulador from './Simulador'

const H = {
  id: 'terremoto', icono: '', nombre: 'Terremoto',
  controles: [{ id: 'mw', tipo: 'numero', etiqueta: 'Magnitud', ayuda: null, minimo: 5, maximo: 9, paso: 0.1, escala: 1, unidad: 'Mw', defecto: 7.8, opciones: null }],
} as unknown as Herramienta
const CATALOGO = { extensiones_km: [20, 30], herramientas: [H], mundos: [] } as unknown as Catalogo
const peticiones: (PeticionEvento | undefined)[] = []

vi.mock('../../api/simulador', async (original) => ({
  ...(await original<typeof import('../../api/simulador')>()),
  useCatalogo: () => ({ data: CATALOGO, isError: false }),
  useMundo: () => ({ data: MUNDO, isPending: false, isError: false, isFetching: false }),
  useEvento: (req: PeticionEvento | undefined) => { peticiones.push(req); return { data: undefined, isFetching: false, isError: false } },
}))
vi.mock('./Tablero', () => ({ Tablero: ({ onCelda }: { onCelda: (i: number, j: number) => void }) => <button type="button" onClick={() => onCelda(10, 20)}>celda</button> }))

describe('Simulador · valores enviados', () => {
  it('envía los valores visibles aunque el usuario no los toque (Mw 7,8, no el defecto de la API)', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ProveedorIdioma inicial="es">
          <MemoryRouter initialEntries={['/simular?h=terremoto']}><Simulador /></MemoryRouter>
        </ProveedorIdioma>
      </QueryClientProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'celda' }))
    const ultima = peticiones.filter(Boolean).at(-1)
    expect(ultima?.parametros).toMatchObject({ mw: 7.8 })
  })
})

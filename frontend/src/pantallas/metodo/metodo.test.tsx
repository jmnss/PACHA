import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import Metodo from './Metodo'

const ESC = [{ id: 'embalse-mazar', nombre: 'Embalse Mazar', historia: 'embalse', sitio: 'mazar',
  origen: { tipo: 'real', clase: 'nisar', fuente: 'equipo PACHA', fecha_generacion: '2026-11-15', procedencia: { producto: 'GCOV', polarizaciones: ['HH', 'HV'], granulos: [], metodo: { nombre: 'clasificación supervisada', clases: 2 }, autor: 'equipo PACHA' } } }]
const RES = { escenario_id: 'embalse-mazar', nombre: 'Embalse Mazar', historia: 'embalse', fechas: [
  { adquisicion_id: 'a', fecha: '2026-08-13', superficie_km2: 7.08, retrodispersion: [] },
  { adquisicion_id: 'b', fecha: '2026-10-29', superficie_km2: 5.67, retrodispersion: [] }],
  variacion: { antes_id: 'a', despues_id: 'b', fecha_antes: '2026-08-13', fecha_despues: '2026-10-29', dias: 77, antes_km2: 7.08, despues_km2: 5.67, absoluta_km2: -1.41, relativa_pct: -19.9 },
  incendio: null, escala_db: {}, ficha: [], lecturas: [], origen: ESC[0].origen }

vi.mock('../../api/cliente', async (orig) => ({
  ...(await orig<typeof import('../../api/cliente')>()),
  llamar: vi.fn(async (ruta: string) => (ruta.endsWith('/resumen') ? RES : ESC)),
}))

const montar = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter><Metodo /></MemoryRouter>
  </QueryClientProvider>,
)

describe('Cómo lo hacemos', () => {
  it('muestra los seis pasos', () => {
    montar()
    expect(screen.getAllByText(/^Paso \d de 6$/)).toHaveLength(6)
  })
  it('el método y las cifras salen de la API', async () => {
    montar()
    expect(await screen.findByText('clasificación supervisada')).toBeInTheDocument()
    expect(await screen.findByText(/7,08 km²/)).toBeInTheDocument()
    expect(screen.getByText(/−?-?1,41 km² \(−?-?19,9 %\) en 77 días/)).toBeInTheDocument()
  })
})

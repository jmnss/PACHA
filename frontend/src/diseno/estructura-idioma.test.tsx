import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { en } from '../idioma/catalogos/en'
import { qu } from '../idioma/catalogos/qu'
import { renderConIdioma, renderPseudo, textosSinTraducir } from '../idioma/pruebas'
import { BandaDemostracion } from './BandaDemostracion'
import { Cargando, ErrorBloque } from './Estados'
import { Estructura } from './Estructura'
import { Tabla } from './Tabla'

const origen = {
  tipo: 'sintetico' as const, fuente: 'Generador de demostración PACHA', producto: null,
  generador: 'datos/generador.py', version: '1', semilla: 7, fecha_generacion: '2026-11-05T08:00:00Z', notas: null,
}
const salud = { estado: 'ok', hay_sinteticos: true, origen_tipo: 'sintetico', proveedor: 'x', version: '1' }

function simularApi() {
  vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) =>
    Promise.resolve(new Response(JSON.stringify(
      url.includes('/api/salud') ? salud : [{ id: 'a', nombre: 'A', origen, adquisiciones: [] }],
    )))))
}
function envolver(ui: React.ReactElement) {
  return (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  )
}
const estructura = envolver(
  <Routes><Route element={<Estructura />}><Route index element={<p>⟦hola⟧</p>} /></Route></Routes>,
)
afterEach(() => vi.unstubAllGlobals())

describe('estructura sin textos sueltos', () => {
  it('Estructura con la banda abierta', async () => {
    simularApi()
    const { container } = renderPseudo(estructura)
    fireEvent.click(await screen.findByRole('button', { name: /Qué significa/ }))
    await screen.findByRole('dialog')
    await waitFor(() => expect(screen.getByText('2026-11-05')).toBeInTheDocument())
    expect(textosSinTraducir(container)).toEqual([])
  })
  it('Cargando, ErrorBloque y Tabla paginada', () => {
    const filas = Array.from({ length: 60 }, (_, i) => ({ n: `⟦f${i}⟧`, v: i === 0 ? null : i }))
    const { container } = renderPseudo(
      <>
        <Cargando />
        <ErrorBloque mensaje="x" ultimoDato="10:00" onReintentar={() => {}} />
        <Tabla titulo="⟦t⟧" columnas={[{ clave: 'n', etiqueta: '⟦n⟧' }, { clave: 'v', etiqueta: '⟦v⟧', numerica: true }]} filas={filas} />
      </>,
    )
    expect(textosSinTraducir(container).filter((s) => s !== 'x')).toEqual([])
  })
})

describe('honestidad de la banda en los tres idiomas', () => {
  it.each([['es', 'DATOS DE DEMOSTRACIÓN · no son observaciones reales de NISAR'],
    ['en', en['estructura.banda.largo']], ['qu', qu['estructura.banda.largo']]] as const)(
    'en %s existe, sin botón de cerrar', async (idioma, largo) => {
      simularApi()
      const { container } = renderConIdioma(envolver(<BandaDemostracion />), idioma)
      await waitFor(() => expect(container.querySelector('.banda-demo__largo')).not.toBeNull())
      expect(container.querySelector('.banda-demo__largo')).toHaveTextContent(largo)
      expect(screen.getAllByRole('button')).toHaveLength(1)
      expect(screen.queryByRole('button', { name: /cerrar|close|wichkay|ocultar/i })).toBeNull()
    })
})

describe('riel', () => {
  it('las etiquetas cortas en kichwa caben (≤ 8 caracteres)', async () => {
    simularApi()
    renderConIdioma(estructura, 'qu')
    const nav = screen.getByRole('navigation', { name: qu['estructura.riel.principal'] })
    for (const l of within(nav).getAllByRole('link')) {
      expect(l.querySelector('.riel__etiqueta')!.textContent!.length).toBeLessThanOrEqual(8)
    }
  })
})

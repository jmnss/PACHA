import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderPseudo, textosSinTraducir } from '../idioma/pruebas'
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
  it('Estructura', async () => {
    simularApi()
    const { container } = renderPseudo(estructura)
    await screen.findByText('⟦hola⟧')
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

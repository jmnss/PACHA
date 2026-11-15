import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Catalogo, EventoDto, Herramienta, PeticionEvento } from '../../api/simulador'
import { ProveedorIdioma } from '../../idioma/ProveedorIdioma'
import { INCENDIO, MUNDO } from './fixtures'
import Simulador from './Simulador'

const H = {
  id: 'incendio', icono: '', nombre: 'Incendio', controles: [
    { id: 'viento_ms', etiqueta: 'Viento', tipo: 'numero', minimo: 0, maximo: 20, paso: 0.5, defecto: 6, opciones: null, ayuda: '', unidad: 'm/s', escala: 1 },
    { id: 'semilla', etiqueta: 'Semilla del azar', tipo: 'numero', minimo: 0, maximo: 9999, paso: 1, defecto: 7, opciones: null, ayuda: '', unidad: '', escala: 1 },
  ],
} as unknown as Herramienta
const CATALOGO = {
  extensiones_km: [20, 30], herramientas: [H, { ...H, id: 'terremoto', nombre: 'Terremoto' }],
  mundos: [{ nombre: 'Cerro Casitagua', lat: -0.03, lon: -78.52, extension_km: 20, herramienta: 'incendio', descripcion: 'Cerro al norte de Quito.' }],
} as unknown as Catalogo
const EVENTO = {
  ...INCENDIO,
  metricas: [{ etiqueta: 'Área quemada', valor: '1,80 km²', ayuda: '', lectura: 'Como unas 252 canchas de fútbol.' }],
} as unknown as EventoDto

vi.mock('../../api/simulador', async (original) => ({
  ...(await original<typeof import('../../api/simulador')>()),
  useCatalogo: () => ({ data: CATALOGO, isError: false }),
  useMundo: () => ({ data: MUNDO, isPending: false, isError: false, isFetching: false }),
  useEvento: (req?: PeticionEvento) => ({ data: req ? EVENTO : undefined, isFetching: false, isError: false }),
}))
vi.mock('./Tablero', () => ({ Tablero: () => <div data-testid="tablero" /> }))
vi.mock('./ResultadosEvento', () => ({ ResultadosEvento: () => <div data-testid="detalle" /> }))

afterEach(() => vi.unstubAllGlobals())

const movil = () => vi.stubGlobal('matchMedia', (q: string) => ({ matches: true, media: q, addEventListener: () => {}, removeEventListener: () => {} }))
function montar(ruta = '/simular') {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <ProveedorIdioma inicial="es">
        <MemoryRouter initialEntries={[ruta]}><Simulador /></MemoryRouter>
      </ProveedorIdioma>
    </QueryClientProvider>,
  )
}

describe('Simulador · tres pasos', () => {
  it('paso 1: tarjetas de fenómeno, sin mapa; al elegir incendio, el mapa en el Cerro Casitagua', () => {
    montar()
    expect(screen.queryByTestId('tablero')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Incendio/ }))
    expect(screen.getByTestId('tablero')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Pasos del simulador' })).toHaveTextContent('Cerro Casitagua')
  })

  it('el Resultado solo aparece tras «Desatar», con su frase llana, el sello y el enlace al radar', () => {
    montar('/simular?h=incendio&lat=-0.03&lon=-78.52&ext=20')
    expect(screen.queryByRole('heading', { name: 'Resultado' })).toBeNull()
    const avanzado = screen.getByText('Avanzado').closest('details')!
    expect(avanzado.open).toBe(false)
    expect(within(avanzado).getByText('Semilla del azar')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Desatar' }))
    expect(screen.getByRole('heading', { name: 'Resultado' })).toBeInTheDocument()
    expect(screen.getByText('Como unas 252 canchas de fútbol.')).toBeInTheDocument()
    expect(screen.getByText('ejemplo de demostración')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Compáralo con lo que vio el radar' })).toHaveAttribute('href', '/explorar/historias?historia=incendio')
    expect(screen.getByText('evento real · fuente por añadir')).toBeInTheDocument()
  })

  it('en móvil: el mapa sin panel al lado; «Ajustes» abre la hoja y «Desatar» sube el resultado en otra hoja', () => {
    movil()
    montar('/simular?h=incendio&lat=-0.03&lon=-78.52&ext=20')
    expect(screen.getByTestId('tablero')).toBeInTheDocument()
    expect(screen.queryByText('Avanzado')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Ajustes' }))
    expect(within(screen.getByRole('dialog', { name: 'Ajustes' })).getByText('Avanzado')).toBeInTheDocument()
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Ajustes' })).getByRole('button', { name: 'Desatar' }))
    const hoja = screen.getByRole('dialog', { name: 'Resultado' })
    expect(within(hoja).getByText('Como unas 252 canchas de fútbol.')).toBeInTheDocument()
  })
})

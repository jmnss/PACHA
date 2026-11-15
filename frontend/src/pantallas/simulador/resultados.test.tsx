import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { csvBitacora, entradaDeEvento, leerBitacora, guardarBitacora } from './bitacora'
import { ESTADO_INICIAL } from './estadoSimulador'
import { INCENDIO, MUNDO, ORIGEN, TERREMOTO } from './fixtures'
import { EsperaRadar } from './EsperaRadar'
import { GemeloRadar } from './GemeloRadar'
import { lineasInforme } from './informe'
import { ResultadosEvento } from './ResultadosEvento'
import { ProveedorIdioma } from '../../idioma/ProveedorIdioma'
import type { EventoDto } from '../../api/simulador'

vi.mock('../../comparador/Comparador', () => ({
  Comparador: (p: { etiquetaAntes: string; etiquetaDespues: string }) => <div data-testid="comparador">{p.etiquetaAntes} | {p.etiquetaDespues}</div>,
}))

const envolver = (ui: React.ReactElement) => render(
  <QueryClientProvider client={new QueryClient()}><MemoryRouter>{ui}</MemoryRouter></QueryClientProvider>,
)

beforeEach(() => localStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe('GemeloRadar', () => {
  it('un incendio usa el comparador y nombra la polarización HV', () => {
    envolver(<GemeloRadar evento={INCENDIO} />)
    expect(screen.getByTestId('comparador')).toHaveTextContent('σ⁰ HV antes (dB) | σ⁰ HV después (dB)')
    expect(screen.getByText(/polarización HV/i)).toBeInTheDocument()
    expect(screen.getByText('Razón logarítmica HV después/antes')).toBeInTheDocument()
  })

  it('un terremoto muestra una rejilla de paneles, sin comparador', () => {
    envolver(<GemeloRadar evento={TERREMOTO} />)
    expect(screen.queryByTestId('comparador')).not.toBeInTheDocument()
    expect(screen.getByText('Deformación vertical (cm)')).toBeInTheDocument()
    expect(screen.getByText('Desplazamiento este (cm)')).toBeInTheDocument()
  })

  it('dice que es una simulación y no una observación', () => {
    envolver(<GemeloRadar evento={INCENDIO} />)
    expect(screen.getByText(/simulación de un radar como NISAR/i)).toBeInTheDocument()
  })
})

describe('EsperaRadar', () => {
  it('declara el ciclo como pendiente de confirmar y usa solo cifras del servidor', () => {
    envolver(<EsperaRadar espera={INCENDIO.espera_radar} origen={ORIGEN} />)
    expect(screen.getByText(/pendiente de confirmar con la documentación oficial/)).toBeInTheDocument()
    expect(screen.getByText(/entre 0 y 12 días/)).toBeInTheDocument()
    expect(screen.getByText(/6 días/)).toBeInTheDocument()
    expect(screen.getByText(/24 h/)).toBeInTheDocument()
  })

  it('un evento instantáneo no inventa una duración', () => {
    envolver(<EsperaRadar espera={TERREMOTO.espera_radar} origen={ORIGEN} />)
    expect(screen.getByText(/instantáneo/i)).toBeInTheDocument()
  })
})

describe('bitácora', () => {
  it('el CSV empieza con las líneas de origen sintético', () => {
    const csv = csvBitacora([entradaDeEvento(INCENDIO, MUNDO, '?a=1')], ORIGEN)
    expect(csv.split('\n')[0]).toBe('# origen: sintético')
    expect(csv).toContain('DATOS DE DEMOSTRACIÓN')
    expect(csv).toContain('Incendio forestal')
  })

  it('sin localStorage sigue funcionando', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('bloqueado') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('bloqueado') })
    expect(leerBitacora()).toEqual([])
    expect(() => guardarBitacora([entradaDeEvento(INCENDIO, MUNDO, '?a=1')])).not.toThrow()
  })

  it('guarda, relee y limita a 50 entradas', () => {
    const e = entradaDeEvento(INCENDIO, MUNDO, '?a=1')
    guardarBitacora(Array.from({ length: 60 }, (_, k) => ({ ...e, enlace: `?k=${k}` })))
    expect(leerBitacora()).toHaveLength(50)
  })
})

describe('informe y enlace', () => {
  it('las líneas del informe llevan el título, los KPI y el aviso de simulación', () => {
    const l = lineasInforme(INCENDIO, MUNDO).join('\n')
    expect(l).toContain('Incendio forestal')
    expect(l).toContain('12,3 km²')
    expect(l).toContain('Simulación')
  })

  it('copiar enlace escribe el estado en la URL', async () => {
    const escribir = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: escribir }, configurable: true })
    envolver(<ResultadosEvento evento={INCENDIO} mundo={MUNDO} estado={{ ...ESTADO_INICIAL, i: 60, j: 61 }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Copiar enlace' }))
    await waitFor(() => expect(escribir).toHaveBeenCalled())
    expect(escribir.mock.calls[0][0]).toMatch(/\/simular\?.*i=60.*j=61/)
    expect(await screen.findByText('Enlace copiado.')).toBeInTheDocument()
  })

  it('los resultados muestran los KPI, la tabla y los modelos usados', () => {
    envolver(<ResultadosEvento evento={INCENDIO} mundo={MUNDO} estado={{ ...ESTADO_INICIAL, i: 60, j: 60 }} />)
    expect(screen.getByText('12,3 km²')).toBeInTheDocument()
    expect(screen.getByText('Bosque seco')).toBeInTheDocument()
    expect(screen.getByText('Rothermel (1972)')).toBeInTheDocument()
  })
})

describe('ResultadosEvento · notas y celdas con clave', () => {
  const CON_CLAVES = {
    ...INCENDIO,
    notas: ['Lluvia de 150 mm en 2 h con radio de 15 km. Humedad antecedente del suelo: 50 % del agua útil (CN normal (AMC II)).', 'Texto nuevo del modelo.'],
    notas_texto: [
      { clave_texto: 'api.sim.nota.tormenta.lluvia_normal', valores_texto: { mm: 150, h: 2, km: 15, pct: 50 }, decimales_texto: { mm: 1, h: 0, km: 0, pct: 0 } },
      null,
    ],
    tabla: { columnas: ['Cobertura', 'Área (km²)'], filas: [['Zona urbana', 8.2]], celdas_texto: [[{ clave_texto: 'api.sim.celda.zona_urbana', valores_texto: {}, decimales_texto: {} }, null]] },
  } as unknown as EventoDto
  const enIdioma = (ev: EventoDto, idioma: 'es' | 'en') => render(
    <ProveedorIdioma inicial={idioma}><QueryClientProvider client={new QueryClient()}><MemoryRouter>
      <ResultadosEvento evento={ev} mundo={MUNDO} estado={{ ...ESTADO_INICIAL, i: 60, j: 60 }} />
    </MemoryRouter></QueryClientProvider></ProveedorIdioma>,
  )

  it('en inglés traduce la nota con sus decimales y la celda; lo que no encaja queda en español con lang="es"', () => {
    enIdioma(CON_CLAVES, 'en')
    expect(screen.getByText(/Rainfall of 150\.0 mm in 2 h with a radius of 15 km/)).toBeInTheDocument()
    expect(screen.getByText('Urban area')).toBeInTheDocument()
    expect(screen.getByText('Texto nuevo del modelo.')).toHaveAttribute('lang', 'es')
  })

  it('sin notas_texto, el español con lang="es"', () => {
    enIdioma(INCENDIO, 'en')
    expect(screen.getByText('Nota del modelo.')).toHaveAttribute('lang', 'es')
  })
})

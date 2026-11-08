import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ResultadoCambio } from '../../api/consultas'
import { NotasModelo } from '../../diseno/NotasModelo'
import { ProveedorIdioma } from '../../idioma/ProveedorIdioma'
import { valoresApi } from '../../idioma/clavesApi'
import { formatoNumero } from '../../idioma/formato'
import { TablaResultados } from './TablaResultados'

const origen = { tipo: 'sintetico', fuente: 'Generador de demostración', generador: 'datos/generador.py', version: '1', semilla: 7, fecha_generacion: '2026-11-04T00:00:00Z' } as const
const tc = (clave_texto: string, valores_texto: Record<string, number | string> = {}, decimales_texto: Record<string, number> = {}) => ({ clave_texto, valores_texto, decimales_texto })

const TABLA = {
  titulo: 'Resultados por parcela', origen, titulo_texto: tc('api.obs.titulo_tabla.resultados_por_parcela'),
  columnas: ['Parcela', 'Rotación', 'Cosecha estimada', 'Columna nueva'],
  columnas_texto: [tc('api.obs.columna.parcela'), tc('api.obs.columna.rotacion'), tc('api.obs.columna.cosecha_estimada'), null],
  filas: [[0, 'Arroz → Arroz', '2026-05-26', 'Texto raro'], [1, 'Banano', null, 'Otro']],
  celdas_texto: [[null, tc('api.obs.valor.arroz_arroz'), null, null], [null, tc('api.obs.valor.banano'), null, null]],
} as unknown as ResultadoCambio['tablas'][number]

const en = (ui: React.ReactElement, idioma: 'es' | 'en' = 'en') => render(<ProveedorIdioma inicial={idioma}>{ui}</ProveedorIdioma>)

describe('textos del Observatorio por clave', () => {
  it('la tabla por parcela en inglés no deja español salvo lo que no encaja (con lang="es")', () => {
    const { container } = en(<TablaResultados tabla={TABLA} escenario="ec_daule" />)
    expect(screen.getAllByText('Results by parcel').length).toBeGreaterThan(0)
    const tabla = screen.getByRole('table')
    expect(within(tabla).getAllByRole('columnheader').map((c) => c.textContent)).toEqual(['Parcel', 'Rotation', 'Estimated harvest', 'Columna nueva'])
    expect(within(tabla).getByText('Rice → Rice')).toBeInTheDocument()
    expect(within(tabla).getByText('Banana')).toBeInTheDocument()
    expect(within(tabla).getByText('Texto raro')).toHaveAttribute('lang', 'es')
    expect(within(tabla).getByText('May 26, 2026')).not.toHaveAttribute('lang')
    const sinMarca = container.cloneNode(true) as HTMLElement
    sinMarca.querySelectorAll('[lang="es"]').forEach((e) => e.remove())
    expect(sinMarca.textContent).not.toMatch(/Resultados|Rotación|Parcela|Arroz|Banano|Cosecha/)
  })

  it('en español la tabla no marca nada como traducido y las columnas sin clave llevan lang="es"', () => {
    en(<TablaResultados tabla={TABLA} escenario="ec_daule" />, 'es')
    const cabecera = screen.getAllByRole('columnheader').find((c) => c.textContent === 'Columna nueva')!
    expect(cabecera).toHaveAttribute('lang', 'es')
    expect(screen.getByText('Rotación')).not.toHaveAttribute('lang')
  })

  it('una nota con cifras lleva su clave y signos; sin clave usa la derivada del escenario', () => {
    en(<NotasModelo escenarioId="ec_pedernales" notas={['Vector LOS (este, norte, arriba) = (+0.64, +0.09, -0.77). NISAR mira…', 'Los píxeles con coherencia < 0,25 (ruptura superficial, decorrelación) se enmascaran, como hacen las componentes conexas del producto GUNW.']}
      textos={[tc('api.plantilla.nota.pedernales_los', { le_signo_punto: 0.64, ln_signo_punto: 0.09, lu_signo_punto: -0.77 }, { le_signo_punto: 2, ln_signo_punto: 2, lu_signo_punto: 2 }), null]} />)
    expect(screen.getByText(/LOS vector \(east, north, up\) = \(\+0\.64, \+0\.09, -0\.77\)/)).toBeInTheDocument()
    expect(screen.getByText(/Pixels with coherence/i)).toBeInTheDocument()
  })

  it('los valores de signo (`_signo_punto`) se escriben con signo y sus decimales', () => {
    const f = (n: number, op?: Intl.NumberFormatOptions) => formatoNumero('en', n, op)
    expect(valoresApi({ a_signo_punto: 0.4, b_signo_punto: -0.09, hl_punto: 0.3 }, f, undefined, { a_signo_punto: 2, b_signo_punto: 2, hl_punto: 2 }))
      .toEqual({ a_signo_punto: '+0.40', b_signo_punto: '-0.09', hl_punto: '0.30' })
  })
})

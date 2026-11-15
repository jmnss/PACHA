import { render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CapaDto } from '../api/consultas'
import type { Rejilla } from '../api/rejilla'
import { Comparador } from '../comparador/Comparador'
import { LienzoCapa } from '../pantallas/observatorio/LienzoCapa'
import { PanelRadar } from '../pantallas/simulador/PanelRadar'
import { renderConIdioma } from '../idioma/pruebas'
import { mediaRejilla, resumenLienzo } from './resumenLienzo'
import { traductor } from '../idioma/traductor'
import { Tabla } from './Tabla'

const origen = { tipo: 'sintetico', fuente: 'prueba', fecha_generacion: '2026-01-01T00:00:00Z' } as never
const rejilla = (codigos: number[], vmin = -30, vmax = 0): Rejilla =>
  ({ bbox: [-80, -3, -79, -2], columnas: 2, filas: 2, vmin, vmax, datos_b64: btoa(String.fromCharCode(...codigos)) })
const A = rejilla([1, 64, 128, 255])
const capa = (extra: Partial<CapaDto> = {}) => ({
  adquisicion_id: null, escenario_id: 'x', instante: null, leyenda: null, origen, paleta: 'secuencial', polarizacion: null,
  rejilla: A, unidad: 'dB', variable: 'sigma0', ...extra,
}) as unknown as CapaDto

afterEach(() => vi.unstubAllGlobals())

describe('resumen textual de los lienzos', () => {
  it('la media usa solo las celdas con dato', () => {
    expect(mediaRejilla(rejilla([0, 0, 0, 0]))).toBeNull()
    expect(mediaRejilla(rejilla([0, 255, 255, 0]))).toBeCloseTo(0)
    expect(mediaRejilla(rejilla([1, 1, 0, 0]))).toBeCloseTo(-30)
  })

  it('el resumen declara el origen sintético y la media; una capa categórica no lleva media', () => {
    const { t, } = traductor('es')
    const f = (n: number) => String(n)
    const con = resumenLienzo('Capa', { rejilla: A, origen, unidad: 'dB' }, t, f)
    expect(con).toMatch(/simulaci[óo]n/i)
    expect(con).toContain('Valor medio')
    expect(con).toContain('dB')
    const sin = resumenLienzo('Capa', { rejilla: A, origen, unidad: '', categorica: true }, t, f)
    expect(sin).not.toContain('Valor medio')
  })

  it('el comparador describe sus dos lienzos', () => {
    render(<Comparador antes={A} despues={A} rampa="gris" etiquetaAntes="Antes · 12 abr" etiquetaDespues="Después · 26 nov" origen={origen} unidad="dB" />)
    for (const nombre of ['Antes · 12 abr', 'Después · 26 nov']) {
      const lienzo = screen.getByRole('img', { name: nombre })
      expect(lienzo).toHaveAccessibleDescription(expect.stringContaining(nombre))
      expect(lienzo).toHaveAccessibleDescription(expect.stringContaining('Valor medio'))
    }
  })

  it('el lienzo de capa y el panel del radar tienen descripción en los tres idiomas', () => {
    for (const idioma of ['es', 'en', 'qu'] as const) {
      const { unmount } = renderConIdioma(
        <>
          <LienzoCapa capa={capa()} titulo="Cambio" onPunto={() => {}} onCuadrante={() => {}} punto={null} cuadrante={null} />
          <PanelRadar capa={capa()} titulo="Panel" propio />
        </>, idioma)
      for (const nombre of ['Cambio', 'Panel']) {
        const descripcion = screen.getByRole('img', { name: nombre }).getAttribute('aria-describedby')
        expect(document.getElementById(descripcion!)?.textContent?.trim()).toContain(nombre)
      }
      unmount()
    }
  })
})

describe('Tabla en móvil', () => {
  const columnas = [{ clave: 'n', etiqueta: 'Nombre', identidad: true }, { clave: 'v', etiqueta: 'Valor', numerica: true }]
  const filas = [{ n: 'x', v: 1.5 }, { n: 'y', v: 2 }]
  it('conserva roles de tabla cuando el CSS pone las filas en bloque', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('max-width'), media: q, addEventListener() {}, removeEventListener() {} }))
    render(<Tabla titulo="t" columnas={columnas} filas={filas} />)
    const tabla = screen.getByRole('table')
    expect(tabla).toHaveAttribute('role', 'table')
    expect(within(tabla).getAllByRole('cell')).toHaveLength(4)
    expect(within(tabla).getAllByRole('columnheader')).toHaveLength(2)
    expect(within(tabla).getAllByRole('row')).toHaveLength(3)
  })
  it('en escritorio no añade roles redundantes', () => {
    render(<Tabla titulo="t" columnas={columnas} filas={filas} />)
    expect(screen.getByRole('table')).not.toHaveAttribute('role')
  })
})

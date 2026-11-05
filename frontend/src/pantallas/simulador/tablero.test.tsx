import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { MundoDto } from '../../api/simulador'
import { celdaDesdePunto } from './geometria'
import { Tablero } from './Tablero'

const MUNDO = {
  id: 'abc', n: 128, bbox: [-79.3, -4.1, -79.2, -4.0], region: 'Sierra', fuente_dem: 'terreno sintético', pixel_m: 234,
  habitantes: 1000, humedad_suelo_pct: 50, humedad_combustible_defecto: 0.15, temporada: 'Seca', prec_anual_mm: 900,
  relieve_png_b64: 'AAAA', marcas: [{ x: 0.25, y: 0.5, texto: 'Loja', tipo: 'ciudad' }, { x: 0.8, y: 0.2, texto: 'Cotopaxi', tipo: 'volcan' }],
  origen: { tipo: 'sintetico', fuente: 'Simulador', fecha_generacion: '2026-11-05T00:00:00Z' },
} as unknown as MundoDto

function montar(props: Partial<React.ComponentProps<typeof Tablero>> = {}) {
  const onCelda = vi.fn()
  const r = render(<Tablero mundo={MUNDO} evento={undefined} indice={0} cursor={null} onCelda={onCelda} onCursor={() => {}} {...props} />)
  const caja = screen.getByRole('group', { name: /Tablero del simulador/ })
  // jsdom no mide: un tablero de 128×128 px hace que 1 px = 1 celda.
  caja.getBoundingClientRect = () => ({ left: 0, top: 0, width: 128, height: 128, right: 128, bottom: 128, x: 0, y: 0, toJSON: () => ({}) })
  return { ...r, caja, onCelda }
}

describe('Tablero', () => {
  it('el clic emite la celda (fila, columna) correcta', () => {
    const { caja, onCelda } = montar()
    fireEvent.click(caja, { clientX: 40, clientY: 10 })
    expect(onCelda).toHaveBeenCalledWith(10, 40)
  })

  it('celdaDesdePunto recorta a la malla', () => {
    const rect = { left: 0, top: 0, width: 100, height: 100 } as DOMRect
    expect(celdaDesdePunto(rect, 128, 100, 100)).toEqual([127, 127])
    expect(celdaDesdePunto(rect, 128, -5, -5)).toEqual([0, 0])
  })

  it('el teclado mueve el cursor y Enter desata en la celda del cursor', () => {
    const onCursor = vi.fn()
    const { caja, onCelda } = montar({ cursor: [5, 5], onCursor })
    fireEvent.keyDown(caja, { key: 'ArrowRight' })
    expect(onCursor).toHaveBeenCalledWith([5, 6])
    fireEvent.keyDown(caja, { key: 'ArrowUp', shiftKey: true })
    expect(onCursor).toHaveBeenCalledWith([0, 5])
    fireEvent.keyDown(caja, { key: 'Enter' })
    expect(onCelda).toHaveBeenCalledWith(5, 5)
  })

  it('sin cursor, la primera flecha lo coloca en el centro', () => {
    const onCursor = vi.fn()
    const { caja } = montar({ onCursor })
    fireEvent.keyDown(caja, { key: 'ArrowDown' })
    expect(onCursor).toHaveBeenCalledWith([64, 64])
  })

  it('las marcas llevan su nombre', () => {
    montar()
    expect(screen.getByText('Loja')).toBeInTheDocument()
    expect(screen.getByText(/Cotopaxi/)).toBeInTheDocument()
  })
})

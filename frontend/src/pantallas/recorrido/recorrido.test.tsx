import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GUION } from './guion'
import Recorrido from './Recorrido'

const montar = (ruta = '/recorrido') => render(<MemoryRouter initialEntries={[ruta]}><Recorrido /></MemoryRouter>)

describe('guion', () => {
  it('tiene pasos con rutas internas únicas y duración razonable (< 2 min en total)', () => {
    expect(new Set(GUION.map((p) => p.id)).size).toBe(GUION.length)
    expect(GUION.every((p) => p.ruta.startsWith('/') && p.segundos > 0)).toBe(true)
    expect(GUION.reduce((s, p) => s + p.segundos, 0)).toBeLessThanOrEqual(120)
  })
  it('nunca presenta los datos como reales de NISAR', () => {
    for (const p of GUION) expect(p.texto).not.toMatch(/datos reales|NISAR (midió|observó|detectó)/i)
  })
})

describe('Recorrido', () => {
  it('incrusta la pantalla del paso con ?incrustado=1 y avanza con el teclado', () => {
    const { container } = montar()
    const marco = () => container.querySelector('iframe')!
    expect(marco().getAttribute('src')).toBe('/?incrustado=1')
    fireEvent.keyDown(container.querySelector('.recorrido')!, { key: 'ArrowRight' })
    expect(screen.getByText(GUION[1].titulo)).toBeInTheDocument()
    expect(marco().getAttribute('src')).toBe('/laboratorio?nubes=70&incrustado=1')
  })
  it('pausa y reanuda', () => {
    montar()
    fireEvent.click(screen.getByRole('button', { name: 'Pausar' }))
    expect(screen.getByRole('button', { name: 'Reanudar' })).toBeInTheDocument()
  })
  it('un paso fuera de rango cae al primero', () => {
    montar('/recorrido?paso=99')
    expect(screen.getByText(GUION[0].titulo)).toBeInTheDocument()
  })
})

describe('Recorrido · avance automático', () => {
  afterEach(() => vi.useRealTimers())
  it('avanza de uno en uno (no se salta pasos) y se detiene en el último', () => {
    vi.useFakeTimers()
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
    montar()
    for (let i = 1; i < GUION.length; i++) {
      act(() => { vi.advanceTimersByTime(GUION[i - 1].segundos * 1000) })
      expect(screen.getByText(GUION[i].titulo)).toBeInTheDocument()
    }
    act(() => { vi.advanceTimersByTime(GUION[GUION.length - 1].segundos * 1000) })
    expect(screen.getByRole('button', { name: 'Reanudar' })).toBeInTheDocument()
    vi.unstubAllGlobals()
  })
})

import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTiempoObservatorio } from './useTiempoObservatorio'

const INSTANTES = ['2026-04-12T00:00:00Z', '2026-04-12T03:00:00Z']
const HORA = 3_600_000

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers() })

describe('useTiempoObservatorio · pasos cortos', () => {
  it('play avanza el instante de paso en paso y se detiene en la última pasada', () => {
    const { result } = renderHook(() => useTiempoObservatorio(INSTANTES, '', () => {}))
    act(() => result.current.setPasoMin(60))
    act(() => result.current.play())
    expect(result.current.reproduciendo).toBe(true)
    act(() => { vi.advanceTimersByTime(500) })
    expect(result.current.ms).toBe(Date.parse(INSTANTES[0]) + HORA)
    act(() => { vi.advanceTimersByTime(500) })
    act(() => { vi.advanceTimersByTime(500) })
    expect(result.current.ms).toBe(Date.parse(INSTANTES[1]))
    expect(result.current.reproduciendo).toBe(false)
  })

  it('espera mientras llegan los fotogramas y sigue después', () => {
    const { result } = renderHook(() => useTiempoObservatorio(INSTANTES, '', () => {}))
    act(() => result.current.setPasoMin(60))
    act(() => result.current.setEsperando(true))
    act(() => result.current.play())
    act(() => { vi.advanceTimersByTime(5000) })
    expect(result.current.ms).toBe(Date.parse(INSTANTES[0]))
    act(() => result.current.setEsperando(false))
    act(() => { vi.advanceTimersByTime(500) })
    expect(result.current.ms).toBe(Date.parse(INSTANTES[0]) + HORA)
  })

  it('pausa y cambiar de paso detienen la reproducción', () => {
    const { result } = renderHook(() => useTiempoObservatorio(INSTANTES, '', () => {}))
    act(() => result.current.setPasoMin(60))
    act(() => result.current.play())
    act(() => result.current.pausa())
    expect(result.current.reproduciendo).toBe(false)
    act(() => result.current.play())
    act(() => result.current.setPasoMin(10))
    expect(result.current.reproduciendo).toBe(false)
  })
})

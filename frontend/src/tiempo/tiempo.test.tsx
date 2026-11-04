import { act, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CintaPasadas } from './CintaPasadas'
import { ControlesReproductor } from './ControlesReproductor'
import { usePlayback } from './usePlayback'
import { useInstante } from './useInstante'

function movimiento(reducido: boolean) {
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: reducido && q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {},
    addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false,
  }))
}
beforeEach(() => { vi.useFakeTimers(); movimiento(false) })
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

const serie = (n: number) => Array.from({ length: n }, (_, i) => ({
  id: `a${i}`, instante: new Date(Date.UTC(2026, 0, 1) + i * 12 * 86400000).toISOString(),
}))

describe('usePlayback', () => {
  it('avanza y se detiene al final', () => {
    const { result } = renderHook(() => usePlayback({ total: 3, intervaloMs: 100 }))
    act(() => result.current.play())
    expect(result.current.reproduciendo).toBe(true)
    act(() => { vi.advanceTimersByTime(100) })
    expect(result.current.indice).toBe(1)
    act(() => { vi.advanceTimersByTime(100) })
    expect(result.current.indice).toBe(2)
    expect(result.current.reproduciendo).toBe(false)
    act(() => { vi.advanceTimersByTime(1000) })
    expect(result.current.indice).toBe(2)
  })
  it('play al final reinicia desde el inicio', () => {
    const { result } = renderHook(() => usePlayback({ total: 3, intervaloMs: 100 }))
    act(() => result.current.ir(2))
    act(() => result.current.play())
    expect(result.current.indice).toBe(0)
    expect(result.current.reproduciendo).toBe(true)
  })
  it('con prefers-reduced-motion no arranca solo: play avanza un paso por pulsación', () => {
    movimiento(true)
    const { result } = renderHook(() => usePlayback({ total: 5, intervaloMs: 100 }))
    act(() => result.current.play())
    expect(result.current.reproduciendo).toBe(false)
    expect(result.current.indice).toBe(1)
    act(() => { vi.advanceTimersByTime(5000) })
    expect(result.current.indice).toBe(1)
  })
  it('limpia el temporizador al desmontar', () => {
    const { result, unmount } = renderHook(() => usePlayback({ total: 5, intervaloMs: 100 }))
    act(() => result.current.play())
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})

describe('CintaPasadas', () => {
  it.each([30, 5])('la cinta dibuja tantas muescas como adquisiciones (%i)', (n) => {
    const adq = serie(n)
    const { container } = render(<CintaPasadas adquisiciones={adq} instante={adq[0].instante} onCambio={() => {}} />)
    expect(container.querySelectorAll('.cinta__muesca')).toHaveLength(n)
  })
  it('arrastrar llama a onCambio con el instante más cercano, en minutos', () => {
    const adq = serie(3) // 0, 12 y 24 días
    const onCambio = vi.fn()
    render(<CintaPasadas adquisiciones={adq} instante={adq[0].instante} onCambio={onCambio} />)
    const pista = screen.getByRole('slider')
    pista.getBoundingClientRect = () => ({ left: 0, width: 1000, top: 0, height: 10, right: 1000, bottom: 10, x: 0, y: 0, toJSON() {} })
    fireEvent.pointerDown(pista, { clientX: 500, pointerId: 1, buttons: 1 })
    expect(onCambio).toHaveBeenLastCalledWith(adq[1].instante, 1)
    fireEvent.pointerMove(pista, { clientX: 760, pointerId: 1, buttons: 1 })
    const [iso, idx] = onCambio.mock.calls[onCambio.mock.calls.length - 1]
    expect(idx).toBe(2)
    expect(Date.parse(iso) % 60000).toBe(0)
    expect(Date.parse(iso)).toBeCloseTo(Date.parse(adq[0].instante) + 0.76 * 24 * 86400000, -5)
    fireEvent.pointerUp(pista, { pointerId: 1 })
    fireEvent.pointerMove(pista, { clientX: 0, pointerId: 1, buttons: 1 })
    expect(onCambio.mock.calls[onCambio.mock.calls.length - 1][1]).toBe(2)
  })
  it('teclado: flechas, Inicio y Fin; valuetext legible', () => {
    const adq = serie(4)
    const onCambio = vi.fn()
    render(<CintaPasadas adquisiciones={adq} instante={adq[1].instante} onCambio={onCambio} />)
    const s = screen.getByRole('slider')
    expect(s).toHaveAttribute('aria-valuetext', expect.stringMatching(/Pasada 2 de 4/))
    fireEvent.keyDown(s, { key: 'ArrowRight' })
    expect(onCambio).toHaveBeenLastCalledWith(adq[2].instante, 2)
    fireEvent.keyDown(s, { key: 'Home' })
    expect(onCambio).toHaveBeenLastCalledWith(adq[0].instante, 0)
    fireEvent.keyDown(s, { key: 'End' })
    expect(onCambio).toHaveBeenLastCalledWith(adq[3].instante, 3)
  })
  it('recorta un instante fuera de rango', () => {
    const adq = serie(3)
    render(<CintaPasadas adquisiciones={adq} instante="2030-01-01T00:00:00Z" onCambio={() => {}} />)
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '2')
  })
})

describe('ControlesReproductor', () => {
  const props = {
    pasoMin: 60, onPaso: () => {}, velocidad: 'normal' as const, onVelocidad: () => {}, reproduciendo: false,
    onPlay: () => {}, onPausa: () => {}, onInicio: () => {}, onFinal: () => {}, onAtras: () => {}, onAdelante: () => {}, onEvento: () => {},
  }
  it('todos los controles tienen nombre accesible', () => {
    render(<ControlesReproductor {...props} />)
    for (const b of screen.getAllByRole('button')) expect(b).toHaveAccessibleName()
    for (const c of screen.getAllByRole('combobox')) expect(c).toHaveAccessibleName()
    expect(screen.getAllByRole('button')).toHaveLength(6)
    expect(screen.getByRole('combobox', { name: 'Paso' }).querySelectorAll('option')).toHaveLength(6)
    expect(screen.getByRole('combobox', { name: 'Velocidad' }).querySelectorAll('option')).toHaveLength(3)
  })
  it('deshabilitado muestra el motivo y desactiva todo', () => {
    render(<ControlesReproductor {...props} deshabilitado="Calculando 120 fotogramas…" />)
    expect(screen.getByText('Calculando 120 fotogramas…')).toBeInTheDocument()
    for (const b of screen.getAllByRole('button')) expect(b).toBeDisabled()
  })
})

describe('usePlayback: cambios en pleno play', () => {
  it('cambiar intervaloMs en pleno play no deja temporizadores sueltos ni salta', () => {
    const { result, rerender } = renderHook((p: { total: number; intervaloMs: number }) => usePlayback(p), { initialProps: { total: 10, intervaloMs: 100 } })
    act(() => result.current.play())
    act(() => { vi.advanceTimersByTime(100) })
    expect(result.current.indice).toBe(1)
    rerender({ total: 10, intervaloMs: 500 })
    expect(vi.getTimerCount()).toBe(1)
    act(() => { vi.advanceTimersByTime(499) })
    expect(result.current.indice).toBe(1)
    act(() => { vi.advanceTimersByTime(1) })
    expect(result.current.indice).toBe(2)
    expect(vi.getTimerCount()).toBe(1)
  })
  it('cambiar total en pleno play recorta el índice, sigue sin saltos y termina sin temporizadores', () => {
    const { result, rerender } = renderHook((p: { total: number; intervaloMs: number }) => usePlayback(p), { initialProps: { total: 10, intervaloMs: 100 } })
    act(() => result.current.play())
    for (let k = 0; k < 3; k++) act(() => { vi.advanceTimersByTime(100) })
    expect(result.current.indice).toBe(3)
    rerender({ total: 3, intervaloMs: 100 })
    expect(result.current.indice).toBe(2)
    expect(vi.getTimerCount()).toBeLessThanOrEqual(1)
    act(() => { vi.advanceTimersByTime(1000) })
    expect(result.current.indice).toBe(2)
    expect(result.current.reproduciendo).toBe(false)
    expect(vi.getTimerCount()).toBe(0)
  })
  it('onIndice avisa de los avances del reproductor pero no de ir()', () => {
    const onIndice = vi.fn()
    const { result } = renderHook(() => usePlayback({ total: 5, intervaloMs: 100, onIndice }))
    act(() => result.current.ir(3))
    expect(onIndice).not.toHaveBeenCalled()
    act(() => result.current.paso(-1))
    expect(onIndice).toHaveBeenLastCalledWith(2)
    act(() => result.current.play())
    act(() => { vi.advanceTimersByTime(100) })
    expect(onIndice).toHaveBeenLastCalledWith(3)
  })
})

describe('useInstante', () => {
  const iso = serie(4).map((a) => a.instante)
  it('irAInstante fija el instante exacto y deriva el índice; irAIndice fija la pasada', () => {
    const { result } = renderHook(() => useInstante(iso))
    expect(result.current.indice).toBe(0)
    const t = Date.parse(iso[1]) + 3 * 60000
    act(() => result.current.irAInstante(t))
    expect(result.current.ms).toBe(t)
    expect(result.current.indice).toBe(1)
    act(() => result.current.irAIndice(3))
    expect(result.current.instante).toBe(iso[3])
    act(() => result.current.irAInstante('2100-01-01T00:00:00Z'))
    expect(result.current.instante).toBe(iso[3])
  })
  it('con usePlayback, el reproductor mueve el instante y un arrastre no es pisado', () => {
    const { result } = renderHook(() => {
      const inst = useInstante(iso)
      const pb = usePlayback({ total: iso.length, intervaloMs: 100, onIndice: inst.irAIndice })
      return { inst, pb }
    })
    act(() => result.current.pb.play())
    act(() => { vi.advanceTimersByTime(100) })
    expect(result.current.inst.instante).toBe(iso[1])
    const t = Date.parse(iso[2]) + 7 * 60000
    act(() => { result.current.pb.pausa(); result.current.pb.ir(2); result.current.inst.irAInstante(t) })
    expect(result.current.inst.ms).toBe(t)
    act(() => { vi.advanceTimersByTime(1000) })
    expect(result.current.inst.ms).toBe(t)
  })
})

describe('CintaPasadas: puntero', () => {
  it('termina el arrastre si buttons===0 e ignora el botón secundario', () => {
    const adq = serie(3)
    const onCambio = vi.fn()
    render(<CintaPasadas adquisiciones={adq} instante={adq[0].instante} onCambio={onCambio} />)
    const pista = screen.getByRole('slider')
    pista.getBoundingClientRect = () => ({ left: 0, width: 1000, top: 0, height: 10, right: 1000, bottom: 10, x: 0, y: 0, toJSON() {} })
    fireEvent.pointerDown(pista, { clientX: 500, pointerId: 1, button: 2, buttons: 2 })
    expect(onCambio).not.toHaveBeenCalled()
    fireEvent.pointerDown(pista, { clientX: 500, pointerId: 1, button: 0, buttons: 1 })
    expect(onCambio).toHaveBeenCalledTimes(1)
    fireEvent.pointerMove(pista, { clientX: 900, pointerId: 1, buttons: 0 })
    expect(onCambio).toHaveBeenCalledTimes(1)
    fireEvent.pointerMove(pista, { clientX: 900, pointerId: 1, buttons: 1 })
    expect(onCambio).toHaveBeenCalledTimes(1)
  })
})

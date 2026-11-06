import { fireEvent, render, screen } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import type { Rejilla } from '../api/rejilla'
import { Comparador } from './Comparador'
import { pintarPar } from './pintar'

// jsdom no trae PointerEvent: una subclase de MouseEvent conserva clientX/clientY.
beforeAll(() => {
  class PE extends MouseEvent {
    pointerId: number
    isPrimary: boolean
    constructor(tipo: string, init: PointerEventInit = {}) {
      super(tipo, init); this.pointerId = init.pointerId ?? 1; this.isPrimary = init.isPrimary ?? true
    }
  }
  vi.stubGlobal('PointerEvent', PE)
})

const origen = { tipo: 'sintetico', fuente: 'prueba', fecha_generacion: '2026-01-01T00:00:00Z' } as never

function rejilla(codigos: number[], vmin = -30, vmax = 0, lado = 2): Rejilla {
  return { bbox: [-80, -3, -79, -2], columnas: lado, filas: lado, vmin, vmax, datos_b64: btoa(String.fromCharCode(...codigos)) }
}
const A = rejilla([1, 64, 128, 255])

function montar(extra: Record<string, unknown> = {}, izq = 0, arriba = 0) {
  const props = {
    antes: A, despues: A, rampa: 'gris' as const, etiquetaAntes: 'Antes · 12 abr 2026', etiquetaDespues: 'Después · 26 nov 2026',
    titulo: 'HH, dB', origen, unidad: 'dB', ...extra,
  }
  const r = render(<Comparador {...props} />)
  const esc = r.container.querySelector('.comparador__escenario') as HTMLElement | null
  if (!esc) return { ...r, esc, gesto: null as never, divisor: null as never }
  // Escenario de 200 × 100 px, con su esquina en (izq, arriba).
  esc.getBoundingClientRect = () => ({ left: izq, top: arriba, width: 200, height: 100, right: izq + 200, bottom: arriba + 100, x: izq, y: arriba, toJSON() {} })
  return { ...r, esc, gesto: screen.getByTestId('comparador-gesto'), divisor: screen.getByRole('slider') }
}

describe('Comparador', () => {
  it('el divisor empieza al 50 %', () => {
    const { divisor } = montar()
    expect(divisor).toHaveAttribute('aria-valuenow', '50')
    expect(screen.getByText('HH, dB')).toBeInTheDocument()
    expect(screen.getByText('Antes · 12 abr 2026')).toBeInTheDocument()
  })

  it('las flechas lo mueven 1 % y con Mayús 10 %; Inicio y Fin lo llevan a los extremos', () => {
    const { divisor } = montar()
    fireEvent.keyDown(divisor, { key: 'ArrowRight' })
    expect(divisor).toHaveAttribute('aria-valuenow', '51')
    fireEvent.keyDown(divisor, { key: 'ArrowLeft', shiftKey: true })
    expect(divisor).toHaveAttribute('aria-valuenow', '41')
    fireEvent.keyDown(divisor, { key: 'End' })
    expect(divisor).toHaveAttribute('aria-valuenow', '100')
    fireEvent.keyDown(divisor, { key: 'ArrowRight', shiftKey: true })
    expect(divisor).toHaveAttribute('aria-valuenow', '100')
    fireEvent.keyDown(divisor, { key: 'Home' })
    expect(divisor).toHaveAttribute('aria-valuenow', '0')
  })

  it('el divisor se arrastra desde su zona sin emitir punto ni cuadrante', () => {
    const onPunto = vi.fn(), onCuadrante = vi.fn()
    const { divisor } = montar({ onPunto, onCuadrante })
    fireEvent.pointerDown(divisor, { clientX: 100, clientY: 50 })
    fireEvent.pointerMove(divisor, { clientX: 150, clientY: 50 })
    fireEvent.pointerUp(divisor, { clientX: 150, clientY: 50 })
    expect(divisor).toHaveAttribute('aria-valuenow', '75')
    expect(onPunto).not.toHaveBeenCalled()
    expect(onCuadrante).not.toHaveBeenCalled()
  })

  it('un clic sin arrastre emite punto normalizado', () => {
    const onPunto = vi.fn(), onCuadrante = vi.fn()
    const { gesto } = montar({ onPunto, onCuadrante })
    fireEvent.pointerDown(gesto, { clientX: 50, clientY: 25 })
    fireEvent.pointerUp(gesto, { clientX: 50, clientY: 25 })
    expect(onPunto).toHaveBeenCalledWith([0.25, 0.25])
    expect(onCuadrante).not.toHaveBeenCalled()
  })

  it('un arrastre de más del 1,2 % emite cuadrante normalizado y ordenado', () => {
    const onPunto = vi.fn(), onCuadrante = vi.fn()
    const { gesto } = montar({ onPunto, onCuadrante })
    fireEvent.pointerDown(gesto, { clientX: 40, clientY: 20 })
    fireEvent.pointerMove(gesto, { clientX: 100, clientY: 60 })
    expect(screen.getByTestId('comparador-cuadrante')).toBeInTheDocument()
    fireEvent.pointerUp(gesto, { clientX: 100, clientY: 60 })
    expect(onCuadrante).toHaveBeenLastCalledWith([0.2, 0.2, 0.5, 0.6])
    // Hacia arriba y a la izquierda: sale ordenado igual.
    fireEvent.pointerDown(gesto, { clientX: 100, clientY: 60 })
    fireEvent.pointerMove(gesto, { clientX: 40, clientY: 20 })
    fireEvent.pointerUp(gesto, { clientX: 40, clientY: 20 })
    expect(onCuadrante).toHaveBeenLastCalledWith([0.2, 0.2, 0.5, 0.6])
    expect(onPunto).not.toHaveBeenCalled()
  })

  it('un temblor de menos del 1,2 % sigue siendo un clic', () => {
    const onPunto = vi.fn(), onCuadrante = vi.fn()
    const { gesto } = montar({ onPunto, onCuadrante })
    fireEvent.pointerDown(gesto, { clientX: 100, clientY: 50 })
    fireEvent.pointerMove(gesto, { clientX: 101, clientY: 50 })
    fireEvent.pointerUp(gesto, { clientX: 101, clientY: 50 })
    expect(onPunto).toHaveBeenCalledTimes(1)
    expect(onCuadrante).not.toHaveBeenCalled()
  })

  it('las coordenadas son relativas a la imagen aunque esté desplazada en la página', () => {
    const onPunto = vi.fn(), onCuadrante = vi.fn()
    const { gesto, divisor } = montar({ onPunto, onCuadrante }, 300, 80)
    fireEvent.pointerDown(gesto, { clientX: 350, clientY: 105 })
    fireEvent.pointerUp(gesto, { clientX: 350, clientY: 105 })
    expect(onPunto).toHaveBeenCalledWith([0.25, 0.25])
    fireEvent.pointerDown(gesto, { clientX: 340, clientY: 100 })
    fireEvent.pointerMove(gesto, { clientX: 400, clientY: 140 })
    fireEvent.pointerUp(gesto, { clientX: 400, clientY: 140 })
    expect(onCuadrante).toHaveBeenCalledWith([0.2, 0.2, 0.5, 0.6])
    fireEvent.pointerDown(divisor, { clientX: 400, clientY: 100 })
    expect(divisor).toHaveAttribute('aria-valuenow', '50')
    fireEvent.pointerMove(divisor, { clientX: 450, clientY: 100 })
    expect(divisor).toHaveAttribute('aria-valuenow', '75')
  })

  it('ignora el botón secundario y los punteros no primarios', () => {
    const onPunto = vi.fn()
    const { gesto } = montar({ onPunto })
    fireEvent.pointerDown(gesto, { clientX: 50, clientY: 25, button: 2 })
    fireEvent.pointerUp(gesto, { clientX: 50, clientY: 25, button: 2 })
    fireEvent.pointerDown(gesto, { clientX: 50, clientY: 25, isPrimary: false })
    fireEvent.pointerUp(gesto, { clientX: 50, clientY: 25, isPrimary: false })
    expect(onPunto).not.toHaveBeenCalled()
  })

  it('siempre muestra la leyenda y el sello de origen, también con aviso o error', () => {
    const { unmount } = montar()
    expect(screen.getByRole('group', { name: /Leyenda/ })).toBeInTheDocument()
    expect(screen.getByText(/^Sintético/)).toBeInTheDocument()
    unmount()
    montar({ despues: rejilla([1, 2, 3, 4], -20, 0) }) // rangos distintos: aviso
    expect(screen.getByText(/rangos distintos/)).toBeInTheDocument()
    expect(screen.getByRole('group', { name: /Leyenda/ })).toBeInTheDocument()
    expect(screen.getByText(/^Sintético/)).toBeInTheDocument()
  })

  it('con extensiones distintas (error) sigue mostrando leyenda y sello', () => {
    montar({ despues: rejilla([1, 2, 3, 4, 5, 6, 7, 8, 9], -30, 0, 3) })
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: /Leyenda/ })).toBeInTheDocument()
    expect(screen.getByText(/^Sintético/)).toBeInTheDocument()
  })

  it('si el origen de «después» difiere, se ven los dos sellos', () => {
    const otro = { ...(origen as object), fuente: 'otra fuente' } as never
    montar({ origenDespues: otro })
    expect(screen.getAllByText(/^Sintético/)).toHaveLength(2)
    expect(screen.getByText(/^Sintético · otra fuente/)).toBeInTheDocument()
  })

  it('marca el punto y el cuadrante recibidos', () => {
    montar({ punto: [0.5, 0.5], cuadrante: [0.1, 0.1, 0.3, 0.3] })
    expect(screen.getByTestId('comparador-punto')).toBeInTheDocument()
    expect(screen.getByTestId('comparador-cuadrante')).toBeInTheDocument()
  })

  it('si las extensiones difieren, lo dice en vez de comparar', () => {
    montar({ despues: rejilla([1, 2, 3, 4, 5, 6, 7, 8, 9], -30, 0, 3) })
    expect(screen.getByRole('alert')).toHaveTextContent('no cubren la misma zona')
  })
})

describe('pintarPar', () => {
  it('ambas mitades usan la misma rampa y rango: mismos códigos, mismos píxeles', () => {
    const p = pintarPar(A, A, 'gris')
    expect(Array.from(p.antes.data)).toEqual(Array.from(p.despues.data))
    expect(p.aviso).toBeNull()
    expect([p.vmin, p.vmax]).toEqual([-30, 0])
  })
  it('con rangos distintos usa el rango global y un mismo valor físico da el mismo color', () => {
    const a = rejilla([255, 255, 255, 255], -30, 0) // 0 dB
    const d = rejilla([255, 255, 255, 255], -20, 0) // 0 dB
    const p = pintarPar(a, rejilla([1, 255, 255, 255], -20, 0), 'gris')
    expect(p.aviso).toMatch(/rango/)
    expect([p.vmin, p.vmax]).toEqual([-30, 0])
    const q = pintarPar(a, d, 'gris')
    expect(Array.from(q.antes.data)).toEqual(Array.from(q.despues.data))
    // -20 dB no es el mínimo global (-30): su color no es el del código 1.
    expect(Array.from(p.despues.data.slice(0, 4))).not.toEqual(Array.from(pintarPar(A, A, 'gris').antes.data.slice(0, 4)))
  })
  it('las capas categóricas llevan códigos directos: el código k toma el color k−1', () => {
    const c = rejilla([0, 1, 2, 3], 0, 3)
    const p = pintarPar(c, c, 'gris', ['#4f8fc4', '#e0773a', '#5fc39c'])
    expect(Array.from(p.antes.data.slice(0, 4))).toEqual([0, 0, 0, 0])
    expect(Array.from(p.antes.data.slice(4, 8))).toEqual([0x4f, 0x8f, 0xc4, 255])
    expect(Array.from(p.despues.data.slice(12, 16))).toEqual([0x5f, 0xc3, 0x9c, 255])
  })
})

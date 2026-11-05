import { describe, expect, it } from 'vitest'
import { MAX_FOTOGRAMAS, ventanaFotogramas } from './fotogramas'

const MIN = 60_000
const t0 = Date.parse('2026-01-01T00:00:00Z')
const tMax = t0 + 30 * 17280 * MIN

describe('ventanaFotogramas', () => {
  it('alinea la ventana a bloques de 120 pasos desde la primera pasada', () => {
    const v = ventanaFotogramas(t0, tMax, t0 + 130 * 60 * MIN, 60)!
    expect(v.inicio).toBe(t0 + 120 * 60 * MIN)
    expect(v.n).toBe(MAX_FOTOGRAMAS)
    expect(v.fin).toBe(v.inicio + (MAX_FOTOGRAMAS - 1) * 60 * MIN)
    expect(v.indice).toBe(10)
  })
  it('el mismo bloque da la misma petición (se cachea)', () => {
    const a = ventanaFotogramas(t0, tMax, t0 + 5 * MIN, 1)!
    const b = ventanaFotogramas(t0, tMax, t0 + 100 * MIN, 1)!
    expect(a.inicio).toBe(b.inicio)
    expect(a.fin).toBe(b.fin)
  })
  it('recorta el fin a la última pasada', () => {
    const corto = t0 + 150 * MIN
    const v = ventanaFotogramas(t0, corto, corto - 5 * MIN, 1)!
    expect(v.inicio).toBe(t0 + 120 * MIN)
    expect(v.fin).toBe(corto)
    expect(v.n).toBe(31)
  })
  it('sin al menos dos fotogramas no hay ventana', () => {
    expect(ventanaFotogramas(t0, tMax, tMax, 1)).toBeNull()
    expect(ventanaFotogramas(t0, t0, t0, 1)).toBeNull()
  })
})

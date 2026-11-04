import { describe, expect, it } from 'vitest'
import { formatearFecha } from './fechas'

describe('formatearFecha', () => {
  it('formatea una fecha válida en español y UTC', () => {
    expect(formatearFecha('2026-04-12T00:00:00Z')).toBe('12 abr 2026')
    expect(formatearFecha('2026-11-26T23:59:00-05:00')).toBe('27 nov 2026')
  })
  it('un ISO sin zona se lee como UTC', () => {
    expect(formatearFecha('2026-04-12T23:30:00')).toBe('12 abr 2026')
  })
  it('devuelve null si no es una fecha válida', () => {
    expect(formatearFecha('no es fecha')).toBeNull()
    expect(formatearFecha('')).toBeNull()
    expect(formatearFecha(null)).toBeNull()
    expect(formatearFecha(undefined)).toBeNull()
  })
})

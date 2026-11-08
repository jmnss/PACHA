import { describe, expect, it } from 'vitest'
import { provinciaEn, siguienteProvincia } from './provincia'

describe('provinciaEn', () => {
  it('devuelve nombre y región de la primera provincia bajo el puntero', () => {
    expect(provinciaEn([{ properties: { nombre: 'Manabí', region: 'Costa' } }])).toEqual({ nombre: 'Manabí', region: 'Costa' })
  })
  it('sin provincias o con propiedades incompletas da null', () => {
    expect(provinciaEn([])).toBeNull()
    expect(provinciaEn([{ properties: { region: 'Costa' } }])).toBeNull()
    expect(provinciaEn([{ properties: null }])).toBeNull()
  })
})

describe('siguienteProvincia', () => {
  it('con el mismo nombre devuelve la misma referencia; con otro, la nueva', () => {
    const a = { nombre: 'Manabí', region: 'Costa' }
    expect(siguienteProvincia(a, { nombre: 'Manabí', region: 'Costa' })).toBe(a)
    expect(siguienteProvincia(null, null)).toBeNull()
    const b = { nombre: 'Loja', region: 'Sierra' }
    expect(siguienteProvincia(a, b)).toBe(b)
    expect(siguienteProvincia(a, null)).toBeNull()
    expect(siguienteProvincia(null, a)).toBe(a)
  })
})

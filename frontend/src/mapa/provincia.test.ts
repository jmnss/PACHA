import { describe, expect, it } from 'vitest'
import { provinciaEn } from './provincia'

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

import { describe, expect, it } from 'vitest'
import { parejaDeMayorCambio } from './pareja'

const pasadas = ['2026-01-01', '2026-01-13', '2026-01-25', '2026-02-06'].map((f, i) => ({ id: `p${i}`, instante: `${f}T00:00:00Z` }))
const serie = (valores: number[], etiqueta = 'A'): [string, number, string][] => valores.map((v, i) => [pasadas[i].instante, v, etiqueta])

describe('parejaDeMayorCambio', () => {
  it('elige la pareja ordenada con mayor diferencia absoluta de la serie', () => {
    expect(parejaDeMayorCambio(serie([20, 28, 10, 5]), pasadas)).toEqual([1, 3])
    expect(parejaDeMayorCambio(serie([-12.8, -12.9, -18, -17]), pasadas)).toEqual([0, 2])
  })
  it('usa solo la primera etiqueta de la serie', () => {
    const mezclada = [...serie([1, 2, 3, 4]), ...serie([100, 0, 50, 0], 'B')]
    expect(parejaDeMayorCambio(mezclada, pasadas)).toEqual([0, 3])
  })
  it('sin criterio fiable (serie vacía, plana o con una pasada) devuelve null', () => {
    expect(parejaDeMayorCambio(undefined, pasadas)).toBeNull()
    expect(parejaDeMayorCambio([], pasadas)).toBeNull()
    expect(parejaDeMayorCambio(serie([3, 3, 3, 3]), pasadas)).toBeNull()
    expect(parejaDeMayorCambio(serie([3, 9]), pasadas.slice(0, 1))).toBeNull()
  })
})

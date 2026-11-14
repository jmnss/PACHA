import { describe, expect, it } from 'vitest'
import { esClicEnMarcador } from './marcador'

describe('esClicEnMarcador', () => {
  it('reconoce el marcador y sus hijos, y nada más', () => {
    const marcador = document.createElement('button')
    marcador.className = 'mapa__marcador mapa__marcador--actual'
    const hijo = document.createElement('span')
    marcador.appendChild(hijo)
    expect(esClicEnMarcador(marcador)).toBe(true)
    expect(esClicEnMarcador(hijo)).toBe(true)
    expect(esClicEnMarcador(document.createElement('canvas'))).toBe(false)
    expect(esClicEnMarcador(null)).toBe(false)
    expect(esClicEnMarcador(window)).toBe(false)
  })
})

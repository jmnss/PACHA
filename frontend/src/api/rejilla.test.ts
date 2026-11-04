import { describe, expect, it } from 'vitest'
import { decodificarRejilla, type Rejilla } from './rejilla'

const base = (b64: string, filas: number, columnas: number): Rejilla => ({
  bbox: [0, 0, 1, 1], filas, columnas, datos_b64: b64, vmin: 0, vmax: 1,
})

describe('decodificarRejilla', () => {
  it('decodifica la rejilla con sus dimensiones', () => {
    const bytes = [0, 1, 128, 255, 7, 9]
    const b64 = btoa(String.fromCharCode(...bytes))
    const d = decodificarRejilla(base(b64, 2, 3))
    expect(d).toBeInstanceOf(Uint8Array)
    expect(Array.from(d)).toEqual(bytes)
  })

  it('lanza un error claro si filas*columnas no coincide', () => {
    const b64 = btoa(String.fromCharCode(1, 2, 3))
    expect(() => decodificarRejilla(base(b64, 2, 3))).toThrow(/2×3 = 6.*llegaron 3/)
  })

  it('lanza un error claro con base64 corrupto', () => {
    expect(() => decodificarRejilla(base('***', 1, 1))).toThrow(/base64/)
  })
})

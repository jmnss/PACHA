import { describe, expect, it } from 'vitest'
import { claveDePeticion, hashClave } from './clave'

describe('claveDePeticion', () => {
  it('ordena los parámetros de consulta', () => {
    expect(claveDePeticion('GET', '/api/laboratorio/respuesta?pol=HH&banda=L', undefined))
      .toBe(claveDePeticion('GET', '/api/laboratorio/respuesta?banda=L&pol=HH', undefined))
  })
  it('ordena las claves del cuerpo recursivamente', () => {
    expect(claveDePeticion('POST', '/api/x', { b: 1, a: { d: 2, c: 3 } })).toBe('POST /api/x\n{"a":{"c":3,"d":2},"b":1}')
  })
  it('sin cuerpo deja la cadena vacía tras el salto de línea', () => {
    expect(claveDePeticion('GET', '/api/salud', undefined)).toBe('GET /api/salud\n')
    expect(claveDePeticion('GET', '/api/salud', null)).toBe('GET /api/salud\n')
  })
  it('conserva el orden de los arrays', () => {
    expect(claveDePeticion('POST', '/api/x', { l: [2, 1] })).toBe('POST /api/x\n{"l":[2,1]}')
  })
  it('hashClave da SHA-256 en hex minúsculas', async () => {
    expect(await hashClave('GET /api/salud\n')).toMatch(/^[0-9a-f]{64}$/)
  })
})

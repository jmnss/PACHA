import { describe, expect, it } from 'vitest'
import { es } from '../idioma/catalogos/es'
import { respuestaInesperada } from './errores'

describe('respuestaInesperada', () => {
  it('no filtra el rastro de Python: mensaje genérico con su clave', () => {
    const r = respuestaInesperada(new Error('Traceback (most recent call last): MemoryError'))
    expect(r.estado).toBe(500)
    const c = JSON.parse(r.cuerpo)
    expect(c.clave_texto).toBe('api.error.inesperado')
    expect(c.mensaje).toBe(es['api.error.inesperado'])
    expect(r.cuerpo).not.toContain('Traceback')
  })
})

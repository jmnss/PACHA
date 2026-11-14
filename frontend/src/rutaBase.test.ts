import { describe, expect, it } from 'vitest'
import { conBase } from './rutaBase'

describe('conBase', () => {
  it('antepone la base de publicación a una ruta de la app', () => {
    expect(conBase('/motor/', '/')).toBe('/motor/')
    expect(conBase('/motor/', '/NISAR-Ecuador/')).toBe('/NISAR-Ecuador/motor/')
    expect(conBase('/simulador?lat=1', '/NISAR-Ecuador')).toBe('/NISAR-Ecuador/simulador?lat=1')
    expect(conBase('/')).toBe('/') // BASE_URL por defecto en vitest es '/'
  })
})

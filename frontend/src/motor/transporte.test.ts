import { describe, expect, it, vi } from 'vitest'
import { MotorNoDisponible } from './clienteMotor'
import { claveDePeticion, hashClave } from './clave'
import { crearTransporteNavegador } from './transporte'

const sinPrecalculo = { cargarIndice: async () => ({}), descargar: async () => null }

describe('transporte del navegador', () => {
  it('convierte {estado: 422, cuerpo} en Response 422 con el mismo JSON', async () => {
    const t = crearTransporteNavegador({ ...sinPrecalculo, pedirAlMotor: async () => ({ estado: 422, cuerpo: '{"mensaje":"x","clave_texto":"k"}' }) })
    const r = await t('/api/x', { method: 'GET' })
    expect(r.status).toBe(422)
    expect(r.ok).toBe(false)
    expect(await r.json()).toEqual({ mensaje: 'x', clave_texto: 'k' })
  })

  it('MotorNoDisponible → 503 con clave_texto estructura.motor.no_disponible', async () => {
    const t = crearTransporteNavegador({ ...sinPrecalculo, pedirAlMotor: async () => { throw new MotorNoDisponible('no') } })
    const r = await t('/api/x', { method: 'GET' })
    expect(r.status).toBe(503)
    const c = await r.json()
    expect(c.clave_texto).toBe('estructura.motor.no_disponible')
    expect(typeof c.mensaje).toBe('string')
  })

  it('envía el método, la ruta con consulta y el cuerpo de init.body', async () => {
    const pedir = vi.fn(async () => ({ estado: 200, cuerpo: '{}' }))
    const t = crearTransporteNavegador({ ...sinPrecalculo, pedirAlMotor: pedir })
    await t('/api/a?b=1', { method: 'POST', body: '{"z":1}' })
    expect(pedir).toHaveBeenCalledWith('POST', '/api/a?b=1', '{"z":1}')
    await t('/api/c', { method: 'GET' })
    expect(pedir).toHaveBeenLastCalledWith('GET', '/api/c', null)
  })

  describe('precálculo', () => {
    const ruta = '/api/salud'
    const hashDeSalud = () => hashClave(claveDePeticion('GET', ruta, undefined))

    it('con la clave en el índice usa la respuesta precalculada y no llama al motor', async () => {
      const h = await hashDeSalud()
      const pedir = vi.fn(async () => ({ estado: 200, cuerpo: 'motor' }))
      const t = crearTransporteNavegador({
        pedirAlMotor: pedir,
        cargarIndice: async () => ({ [h]: 'GET /api/salud\n' }),
        descargar: async () => ({ estado: 200, cuerpo: '{"pre":1}' }),
      })
      const r = await t(ruta, { method: 'GET' })
      expect(await r.json()).toEqual({ pre: 1 })
      expect(pedir).not.toHaveBeenCalled()
    })

    it('sin la clave en el índice llama al motor', async () => {
      const pedir = vi.fn(async () => ({ estado: 200, cuerpo: '{"m":1}' }))
      const t = crearTransporteNavegador({ pedirAlMotor: pedir, cargarIndice: async () => ({ otro: 'x' }), descargar: async () => null })
      expect(await (await t(ruta, { method: 'GET' })).json()).toEqual({ m: 1 })
      expect(pedir).toHaveBeenCalledTimes(1)
    })

    it('si el índice no carga (404) usa el motor sin fallar', async () => {
      const pedir = vi.fn(async () => ({ estado: 200, cuerpo: '{"m":1}' }))
      const t = crearTransporteNavegador({
        pedirAlMotor: pedir,
        cargarIndice: async () => { throw new Error('404') },
        descargar: async () => null,
      })
      expect((await t(ruta, { method: 'GET' })).status).toBe(200)
      expect(pedir).toHaveBeenCalledTimes(1)
    })

    it('si la descarga de la entrada falla recurre al motor', async () => {
      const h = await hashDeSalud()
      const pedir = vi.fn(async () => ({ estado: 200, cuerpo: '{"m":1}' }))
      const t = crearTransporteNavegador({ pedirAlMotor: pedir, cargarIndice: async () => ({ [h]: 'x' }), descargar: async () => null })
      expect(await (await t(ruta, { method: 'GET' })).json()).toEqual({ m: 1 })
      expect(pedir).toHaveBeenCalledTimes(1)
    })

    it('el índice se pide una sola vez', async () => {
      const cargar = vi.fn(async () => ({}))
      const t = crearTransporteNavegador({ pedirAlMotor: async () => ({ estado: 200, cuerpo: '{}' }), cargarIndice: cargar, descargar: async () => null })
      await t(ruta, { method: 'GET' })
      await t('/api/escenarios', { method: 'GET' })
      expect(cargar).toHaveBeenCalledTimes(1)
    })
  })
})

import { describe, expect, it, vi } from 'vitest'
import { MotorNoDisponible } from './clienteMotor'
import { crearTransporteNavegador } from './transporte'

describe('transporte del navegador', () => {
  it('convierte {estado: 422, cuerpo} en Response 422 con el mismo JSON', async () => {
    const t = crearTransporteNavegador({ pedirAlMotor: async () => ({ estado: 422, cuerpo: '{"mensaje":"x","clave_texto":"k"}' }) })
    const r = await t('/api/x', { method: 'GET' })
    expect(r.status).toBe(422)
    expect(r.ok).toBe(false)
    expect(await r.json()).toEqual({ mensaje: 'x', clave_texto: 'k' })
  })

  it('MotorNoDisponible → 503 con clave_texto estructura.motor.no_disponible', async () => {
    const t = crearTransporteNavegador({ pedirAlMotor: async () => { throw new MotorNoDisponible('no') } })
    const r = await t('/api/x', { method: 'GET' })
    expect(r.status).toBe(503)
    const c = await r.json()
    expect(c.clave_texto).toBe('estructura.motor.no_disponible')
    expect(typeof c.mensaje).toBe('string')
  })

  it('envía el método, la ruta con consulta y el cuerpo de init.body', async () => {
    const pedir = vi.fn(async () => ({ estado: 200, cuerpo: '{}' }))
    const t = crearTransporteNavegador({ pedirAlMotor: pedir })
    await t('/api/a?b=1', { method: 'POST', body: '{"z":1}' })
    expect(pedir).toHaveBeenCalledWith('POST', '/api/a?b=1', '{"z":1}')
    await t('/api/c', { method: 'GET' })
    expect(pedir).toHaveBeenLastCalledWith('GET', '/api/c', null)
  })
})

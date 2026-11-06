import { afterEach, describe, expect, it, vi } from 'vitest'
import { crearClienteMotor, elegirPuerto, MotorNoDisponible } from './clienteMotor'
import type { MensajeAlMotor, MensajeDelMotor, PuertoMotor } from './protocolo'

function puertoFalso() {
  const enviados: MensajeAlMotor[] = []
  const puerto: PuertoMotor = {
    postMessage: (m) => { enviados.push(m) },
    onmessage: null,
    onerror: null,
  }
  const emitir = (m: MensajeDelMotor) => puerto.onmessage?.({ data: m })
  return { puerto, enviados, emitir }
}

describe('clienteMotor', () => {
  it('envía iniciar una sola vez aunque se llame dos veces', () => {
    const p = puertoFalso()
    const crear = vi.fn(() => p.puerto)
    const c = crearClienteMotor(crear, 'http://x/motor/')
    c.iniciar()
    c.iniciar()
    expect(crear).toHaveBeenCalledTimes(1)
    expect(p.enviados.filter((m) => m.tipo === 'iniciar')).toEqual([{ tipo: 'iniciar', motorUrl: 'http://x/motor/' }])
  })

  it('dos pedidos antes de estar listo se responden cada uno con su id', async () => {
    const p = puertoFalso()
    const c = crearClienteMotor(() => p.puerto, 'http://x/motor/')
    const a = c.pedir('GET', '/api/a', null)
    const b = c.pedir('POST', '/api/b', '{"k":1}')
    const pedidos = p.enviados.filter((m) => m.tipo === 'pedir')
    expect(pedidos.map((m) => (m as { id: number }).id)).toEqual([1, 2])
    expect(c.pendientes()).toBe(2)
    p.emitir({ tipo: 'respuesta', id: 2, estado: 200, cuerpo: 'B' }) // responde la 2 antes que la 1
    p.emitir({ tipo: 'respuesta', id: 1, estado: 422, cuerpo: 'A' })
    expect(await a).toEqual({ estado: 422, cuerpo: 'A' })
    expect(await b).toEqual({ estado: 200, cuerpo: 'B' })
  })

  it('con estado error rechaza las pendientes y las futuras con MotorNoDisponible', async () => {
    const p = puertoFalso()
    const c = crearClienteMotor(() => p.puerto, 'http://x/motor/')
    const pendiente = c.pedir('GET', '/api/a', null)
    p.emitir({ tipo: 'estado', estado: 'error', detalle: 'zip 404' })
    await expect(pendiente).rejects.toBeInstanceOf(MotorNoDisponible)
    await expect(c.pedir('GET', '/api/b', null)).rejects.toBeInstanceOf(MotorNoDisponible)
    expect(c.estado()).toBe('error')
    expect(c.pendientes()).toBe(0)
  })

  it('onerror del puerto equivale a estado error', async () => {
    const p = puertoFalso()
    const c = crearClienteMotor(() => p.puerto, 'http://x/motor/')
    const pendiente = c.pedir('GET', '/api/a', null)
    p.puerto.onerror?.(new Error('boom'))
    await expect(pendiente).rejects.toBeInstanceOf(MotorNoDisponible)
    expect(c.estado()).toBe('error')
  })

  it('pendientes() vuelve a 0 y notifica a los suscriptores', async () => {
    const p = puertoFalso()
    const c = crearClienteMotor(() => p.puerto, 'http://x/motor/')
    const aviso = vi.fn()
    c.suscribir(aviso)
    const r = c.pedir('GET', '/api/a', null)
    expect(aviso).toHaveBeenCalled()
    aviso.mockClear()
    p.emitir({ tipo: 'respuesta', id: 1, estado: 200, cuerpo: '{}' })
    await r
    expect(c.pendientes()).toBe(0)
    expect(aviso).toHaveBeenCalled()
  })
})

describe('elegirPuerto', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('elegirPuerto usa SharedWorker si existe', () => {
    const port = { postMessage: vi.fn(), start: vi.fn(), onmessage: null }
    const Compartido = vi.fn(() => ({ port }))
    const Dedicado = vi.fn()
    vi.stubGlobal('SharedWorker', Compartido)
    vi.stubGlobal('Worker', Dedicado)
    expect(elegirPuerto()).toBe(port)
    expect(Compartido).toHaveBeenCalledTimes(1)
    expect(port.start).toHaveBeenCalled()
    expect(Dedicado).not.toHaveBeenCalled()
  })

  it('elegirPuerto cae a Worker si no hay SharedWorker', () => {
    const w = { postMessage: vi.fn(), onmessage: null }
    const Dedicado = vi.fn(() => w)
    vi.stubGlobal('SharedWorker', undefined)
    vi.stubGlobal('Worker', Dedicado)
    expect(elegirPuerto()).toBe(w)
    expect(Dedicado).toHaveBeenCalledTimes(1)
  })
})

import { afterEach, describe, expect, it, vi } from 'vitest'
import { ErrorApi, llamar } from './cliente'

function responder(estado: number, cuerpo: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo), { status: estado }),
      ),
    ),
  )
}

afterEach(() => vi.unstubAllGlobals())

describe('llamar', () => {
  it('traduce 422 y 503 a ErrorApi con mensaje', async () => {
    responder(422, { mensaje: 'Fuera de Ecuador.' })
    const e422 = await llamar('/api/x', {}).catch((e: ErrorApi) => e)
    expect(e422).toBeInstanceOf(ErrorApi)
    expect(e422).toMatchObject({ estado: 422, mensaje: 'Fuera de Ecuador.', reintentable: false })

    responder(503, { mensaje: 'Datos reales no disponibles.' })
    const e503 = await llamar('/api/x').catch((e: ErrorApi) => e)
    expect(e503).toMatchObject({ estado: 503, mensaje: 'Datos reales no disponibles.', reintentable: true })
  })

  it('un 500 sin cuerpo JSON es reintentable con mensaje genérico', async () => {
    responder(500, 'boom')
    const e = (await llamar('/api/x').catch((x: unknown) => x)) as ErrorApi
    expect(e).toMatchObject({ estado: 500, reintentable: true })
    expect(e.mensaje).toMatch(/servidor/)
  })

  it('un fallo de red da un mensaje en español y es reintentable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    const e = await llamar('/api/salud').catch((x: ErrorApi) => x)
    expect(e).toBeInstanceOf(ErrorApi)
    expect(e).toMatchObject({ estado: 0, mensaje: 'No se pudo conectar con el servidor.', reintentable: true })
  })

  it('GET sin cuerpo y POST con JSON', async () => {
    responder(200, { ok: 1 })
    await llamar('/api/a')
    await llamar('/api/b', { z: 1 })
    const llamadas = vi.mocked(fetch).mock.calls
    expect(llamadas[0][1]).toMatchObject({ method: 'GET' })
    expect(llamadas[1][1]).toMatchObject({ method: 'POST', body: '{"z":1}' })
  })
})

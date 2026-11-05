import { describe, expect, it } from 'vitest'
import { ESTADO_INICIAL, escribirEstado, leerEstado, sanearParametros, type Catalogo } from './estadoSimulador'

const q = (s: string) => new URLSearchParams(s)

const CATALOGO = {
  herramientas: [
    { id: 'incendio', icono: '', nombre: 'Incendio', controles: [
      { id: 'viento_ms', etiqueta: 'Viento', tipo: 'numero', minimo: 0, maximo: 20, paso: 0.5, defecto: 6, opciones: null, ayuda: '', unidad: 'm/s', escala: 1 },
    ] },
    { id: 'terremoto', icono: '', nombre: 'Terremoto', controles: [
      { id: 'mecanismo', etiqueta: 'Mecanismo', tipo: 'seleccion', minimo: null, maximo: null, paso: null, defecto: 'Normal', opciones: ['Normal', 'Inversa (subducción)'], ayuda: '', unidad: '', escala: 1 },
      { id: 'tsunami', etiqueta: 'Tsunami', tipo: 'interruptor', minimo: null, maximo: null, paso: null, defecto: true, opciones: null, ayuda: '', unidad: '', escala: 1 },
    ] },
  ],
  mundos: [], volcanes: [], extensiones_km: [20, 30, 40, 60, 80, 120],
} as unknown as Catalogo

describe('estado del simulador en la URL', () => {
  it('ida y vuelta conserva el estado', () => {
    const e = { ...ESTADO_INICIAL, lat: -0.8, lon: -78.52, ext: 60, fecha: '2026-03-02', dem: false, h: 'terremoto', i: 40, j: 70,
      p: { mecanismo: 'Inversa (subducción)', tsunami: false, mw: 7.5 },
      ciudades: [{ nombre: 'Nueva Esperanza', lat: -0.9, lon: -78.5, habitantes: 50000 }] }
    expect(leerEstado(q(escribirEstado(e)))).toEqual(e)
  })

  it('sin parámetros devuelve el estado inicial', () => {
    expect(leerEstado(q(''))).toEqual(ESTADO_INICIAL)
  })

  it('valores inválidos o manipulados se ignoran', () => {
    const e = leerEstado(q('lat=999&lon=abc&ext=7&fecha=2026-13-45&h=meteorito&i=-3&j=500&p=__proto__:1,x:y&c=a:b:c:d'))
    expect(e.lat).toBe(ESTADO_INICIAL.lat)
    expect(e.lon).toBe(ESTADO_INICIAL.lon)
    expect(e.ext).toBe(ESTADO_INICIAL.ext)
    expect(e.fecha).toBe(ESTADO_INICIAL.fecha)
    expect(e.h).toBe(ESTADO_INICIAL.h)
    expect(e.i).toBeNull()
    expect(e.j).toBeNull()
    expect(e.ciudades).toEqual([])
    expect(Object.keys(e.p)).not.toContain('__proto__')
  })

  it('no admite más de 8 ciudades', () => {
    const c = Array.from({ length: 12 }, (_, k) => `C${k}:-1.4:-78.4:2000`).join(';')
    expect(leerEstado(q(`c=${encodeURIComponent(c)}`)).ciudades).toHaveLength(8)
  })

  it('sanearParametros descarta claves ajenas, valores fuera de rango y opciones inexistentes', () => {
    const s = sanearParametros('incendio', { viento_ms: 99, inventado: 1 }, CATALOGO)
    expect(s).toEqual({})
    expect(sanearParametros('incendio', { viento_ms: 8 }, CATALOGO)).toEqual({ viento_ms: 8 })
    expect(sanearParametros('terremoto', { mecanismo: 'mágico', tsunami: 'sí' }, CATALOGO)).toEqual({})
    expect(sanearParametros('terremoto', { mecanismo: 'Normal', tsunami: false }, CATALOGO)).toEqual({ mecanismo: 'Normal', tsunami: false })
  })
})

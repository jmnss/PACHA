import { describe, expect, it } from 'vitest'
import { ErrorApi, llamar, mensajeDeError } from '../api/cliente'
import type { Origen } from '../diseno/origen'
import { traductor } from '../idioma/traductor'
import { aCsv, lineasOrigen } from './csv'
import { pixelesFranja } from './png'

const demo = { tipo: 'sintetico', fuente: 'Demo', generador: 'g', version: '1', semilla: 1, fecha_generacion: '2026-01-01' } as Origen

describe('exportaciones con idioma', () => {
  it('el CSV conserva las líneas en español y añade # idioma', () => {
    const l = aCsv([{ a: 1 }], ['a'], demo, 'qu').split('\n')
    expect(l[0]).toBe('# origen: sintético')
    expect(l).toContain('# idioma: qu')
    expect(lineasOrigen(demo, 'es').slice(-1)[0]).toBe('# idioma: es')
    expect(lineasOrigen(demo).join()).not.toContain('# idioma')
    expect(lineasOrigen({ ...demo, producto: 'P' } as Origen, 'en').slice(-2)).toEqual(['# producto: P', '# idioma: en'])
  })
  it('la franja de demostración existe en los tres idiomas', () => {
    const f = (i: 'es' | 'en' | 'qu') => pixelesFranja(2000, demo, undefined, traductor(i).t).lineas.join(' ')
    expect(f('en')).toContain('DEMONSTRATION DATA')
    expect(f('es')).toContain('DATOS DE DEMOSTRACIÓN')
    expect(f('qu')).toContain('RIKUCHIY WILLAYKUNA')
  })
  it('ErrorApi guarda clave y valores del cuerpo', async () => {
    const f = globalThis.fetch
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ mensaje: 'X', clave_texto: 'error.nubes_rango', valores_texto: { min: 0, max: 100 } }), { status: 422 })) as typeof fetch
    try {
      const e = await llamar('/x').catch((x: unknown) => x)
      expect(e).toBeInstanceOf(ErrorApi)
      expect((e as ErrorApi).clave).toBe('error.nubes_rango')
      expect((e as ErrorApi).valores).toEqual({ min: 0, max: 100 })
      // Clave desconocida: el español de la API, marcado como no traducido (lang="es" al mostrarlo).
      expect(mensajeDeError(e)).toEqual({ texto: 'X', traducido: false })
    } finally {
      globalThis.fetch = f
    }
  })
  it('mensajeDeError traduce red y genérico', () => {
    expect(mensajeDeError(new Error('x'), traductor('en').t)).toEqual({ texto: 'Could not connect to the server.', traducido: true })
    expect(mensajeDeError(new ErrorApi(500, 'a', true, 'exportar.error.generico'), traductor('en').t)).toEqual({ texto: 'The server could not complete the request.', traducido: true })
  })
})

import { describe, expect, it, vi } from 'vitest'
import type { Origen } from '../diseno/origen'
import { aCsv } from './csv'
import { aPng, ALTO_FRANJA, pixelesFranja } from './png'

const sint = { tipo: 'sintetico', fuente: 'Generador de demostración', generador: 'nisar-demo', version: '1', semilla: 7, fecha_generacion: '2026-11-05T10:00:00Z' } as unknown as Origen
const real = { tipo: 'real', fuente: 'NASA POWER', producto: 'climatología 2001–2025', fecha_generacion: '2026-11-05T10:00:00Z' } as unknown as Origen

describe('aCsv', () => {
  it('CSV sintético empieza con las líneas de origen, en orden', () => {
    const l = aCsv([{ a: 1 }], ['a'], sint).split('\n')
    expect(l.slice(0, 6)).toEqual([
      '# origen: sintético',
      '# fuente: Generador de demostración',
      '# generador: nisar-demo v1',
      '# semilla: 7',
      '# fecha de generación: 2026-11-05T10:00:00Z',
      '# DATOS DE DEMOSTRACIÓN: no son observaciones reales de NISAR',
    ])
    expect(l[6]).toBe('a')
    expect(l[7]).toBe('1')
  })
  it('CSV real no lleva la advertencia', () => {
    const t = aCsv([], ['a'], real)
    expect(t).toContain('# origen: real')
    expect(t).toContain('# producto: climatología 2001–2025')
    expect(t).not.toContain('DEMOSTRACIÓN')
  })
  it('escapa comillas, comas y saltos; null vacío; decimales con punto', () => {
    const t = aCsv([{ a: 'di "hola", ok', b: 'x\ny', c: null, d: 1.5 }], ['a', 'b', 'c', 'd'], real)
    expect(t).toContain('"di ""hola"", ok","x\ny",,1.5')
  })
  it('previene inyección de fórmulas en texto, no en números', () => {
    const t = aCsv([{ a: '=1+1', b: '@x', c: '-5', d: -5, e: '+cmd' }], ['a', 'b', 'c', 'd', 'e'], real)
    expect(t).toContain("'=1+1,'@x,'-5,-5,'+cmd")
  })
})

describe('aPng', () => {
  it('PNG sintético dibuja la franja de 24 px bajo la imagen', async () => {
    const ops: string[] = []
    const ctx = {
      drawImage: () => ops.push('img'),
      fillRect: (...a: number[]) => ops.push(`rect ${a.join(',')}`),
      fillText: (t: string) => ops.push(`texto ${t}`),
      set fillStyle(v: string) { ops.push(`color ${v}`) },
      set font(_v: string) {}, set textBaseline(_v: string) {},
    }
    const salidas: HTMLCanvasElement[] = []
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) { salidas.push(this); return ctx as never })
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((cb) => cb(new Blob(['x'], { type: 'image/png' })))
    const l = document.createElement('canvas'); l.width = 100; l.height = 50
    await aPng(l, sint)
    expect(salidas[0].height).toBe(50 + ALTO_FRANJA)
    expect(ops).toContain('rect 0,50,100,24')
    expect(ops.some((o) => o.startsWith('texto DATOS DE DEMOSTRACIÓN'))).toBe(true)
    expect(ops.indexOf('img')).toBeLessThan(ops.indexOf('rect 0,50,100,24'))
  })
  it('real usa la fuente como texto', () => {
    expect(pixelesFranja(100, real).texto).toBe('NASA POWER')
    expect(pixelesFranja(100, sint).texto).toContain('no son observaciones reales de NISAR')
  })
})

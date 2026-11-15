import { describe, expect, it, vi } from 'vitest'
import type { Origen } from '../diseno/origen'
import { aCsv, celdaCsv } from './csv'
import { aPng, pixelesFranja } from './png'

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
    expect(aCsv([], ['a'], { ...sint, producto: 'P' } as Origen).split('\n')[6]).toBe('# producto: P')
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
  it('neutraliza también espacios iniciales antes de = + - @ y tab/CR iniciales', () => {
    expect(celdaCsv(' =1+1')).toBe("' =1+1")
    expect(celdaCsv('  @cmd')).toBe("'  @cmd")
    expect(celdaCsv('\tx')).toBe("'\tx")
    expect(celdaCsv('\rx')).toBe('"\'\rx"')
    expect(celdaCsv(' hola')).toBe(' hola')
  })

  it('previene inyección de fórmulas en texto, no en números', () => {
    const t = aCsv([{ a: '=1+1', b: '@x', c: '-5', d: -5, e: '+cmd' }], ['a', 'b', 'c', 'd', 'e'], real)
    expect(t).toContain("'=1+1,'@x,'-5,-5,'+cmd")
  })
})

describe('honestidad fail-safe: solo tipo «real» exacto omite la marca', () => {
  const raros: [string, Origen | null | undefined][] = [
    ['synthetic', { ...real, tipo: 'synthetic' as Origen['tipo'] }],
    ['Sintetico', { ...real, tipo: 'Sintetico' as Origen['tipo'] }],
    ['vacío', { ...real, tipo: '' as Origen['tipo'] }],
    ['tipo undefined', { ...real, tipo: undefined as unknown as Origen['tipo'] }],
    ['origen undefined', undefined],
    ['origen null', null],
  ]
  it.each(raros)('CSV con %s lleva «no verificado» y la advertencia', (_n, o) => {
    const l = aCsv([], ['a'], o).split('\n')
    expect(l[0]).toBe('# origen: sintético (no verificado)')
    expect(l).toContain('# DATOS DE DEMOSTRACIÓN: no son observaciones reales de NISAR')
  })
  it.each(raros)('PNG con %s lleva el texto de demostración', (_n, o) => {
    expect(pixelesFranja(900, o).lineas.join(' ')).toBe('Simulación')
  })
  it('fuente y fecha ausentes → «desconocida», sin TypeError', () => {
    const l = aCsv([], ['a'], { tipo: 'sintetico' } as Origen)
    expect(l).toContain('# fuente: desconocida')
    expect(l).toContain('# fecha de generación: desconocida')
    expect(aCsv([], ['a'], null)).toContain('# fuente: desconocida')
  })
})

describe('aPng', () => {
  it('PNG sintético dibuja la franja de 24 px bajo la imagen', async () => {
    const ops: string[] = []
    const ctx = {
      drawImage: () => ops.push('img'),
      fillRect: (...a: number[]) => ops.push(`rect ${a.join(',')}`),
      fillText: (t: string) => ops.push(`texto ${t}`),
      measureText: (t: string) => ({ width: t.length * 6 }),
      set fillStyle(v: string) { ops.push(`color ${v}`) },
      set font(_v: string) {}, set textBaseline(_v: string) {},
    }
    const salidas: HTMLCanvasElement[] = []
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) { salidas.push(this); return ctx as never })
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((cb) => cb(new Blob(['x'], { type: 'image/png' })))
    const l = document.createElement('canvas'); l.width = 100; l.height = 50
    await aPng(l, sint)
    expect(salidas[0].height).toBeGreaterThan(50 + 24 - 1)
    expect(ops.some((o) => o.startsWith('rect 0,50,100,'))).toBe(true)
    expect(ops.some((o) => o.startsWith('texto Simulación'))).toBe(true)
    expect(ops.indexOf('img')).toBeLessThan(ops.findIndex((o) => o.startsWith('rect 0,50')))
  })
  it('real usa la fuente como texto', () => {
    expect(pixelesFranja(900, real).lineas).toEqual(['NASA POWER'])
    expect(pixelesFranja(900, sint).lineas.join(' ')).toBe('Simulación')
  })
  it('ancho suficiente: una línea y 24 px; lienzo de 390 px: dos líneas y 36 px, sin recortar', () => {
    const medir = (t: string) => t.length * 6.5
    const largo = { ...real, fuente: 'NISAR · GCOV · HH/HV · 2026-09-25 · procesado por el equipo PACHA' }
    const ancho = pixelesFranja(900, largo, medir)
    expect([ancho.lineas.length, ancho.alto]).toEqual([1, 24])
    const estrecho = pixelesFranja(390, largo, medir)
    expect([estrecho.lineas.length, estrecho.alto]).toEqual([2, 36])
    expect(estrecho.lineas.join(' ')).toBe(largo.fuente)
    expect(estrecho.lineas.every((l) => medir(l) <= 390 - 16)).toBe(true)
  })
})

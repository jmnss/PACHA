import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { contraste } from './contraste'

// Pares de docs/diseno.md §4 «Contraste» (v2 «Tierra viva»). Se leen los valores de :root en tokens.css; el bloque
// de basalto (.basalto, .mapa…) reasigna nombres heredados a los --mapa-*, que también se comprueban aquí.
const css = readFileSync(resolve(__dirname, 'tokens.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const v = new Map<string, string>()
for (const m of css.matchAll(/(--[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{6})\s*;/g)) if (!v.has(m[1])) v.set(m[1], m[2])
const c = (n: string): string => {
  const x = v.get(n)
  if (!x) throw new Error(`Falta ${n}`)
  return x
}
const al = (texto: string, fondo: string, minimo: number) =>
  it(`${texto} sobre ${fondo} ≥ ${minimo}`, () => {
    expect(contraste(c(texto), c(fondo))).toBeGreaterThanOrEqual(minimo)
  })

describe('contraste: tema claro', () => {
  it('blanco sobre negro ≈ 21', () => {
    expect(contraste('#ffffff', '#000000')).toBeCloseTo(21, 1)
  })

  for (const texto of ['--text', '--secondary', '--muted'])
    for (const fondo of ['--ground', '--surface', '--raised', '--capa-nueva']) al(texto, fondo, 4.5)

  for (const texto of ['--cacao', '--laguna-tinta']) for (const fondo of ['--arcilla', '--papel', '--capa-nueva']) al(texto, fondo, 4.5)

  for (const estado of ['positive', 'negative', 'warning', 'neutral'])
    it(`--pill-${estado}-ink sobre su fondo ≥ 4,5`, () => {
      expect(contraste(c(`--pill-${estado}-ink`), c(`--pill-${estado}-bg`))).toBeGreaterThanOrEqual(4.5)
    })
  // --warning y --negative también se usan como texto suelto (avisos, errores).
  for (const estado of ['--positive', '--negative', '--warning']) for (const fondo of ['--ground', '--surface']) al(estado, fondo, 4.5)

  al('--demo-ink', '--demo-bg', 4.5)
  al('--demo-edge', '--demo-bg', 3)
  al('--demo-edge', '--arcilla', 3)

  // Botón principal: texto basalto sobre ocre y su hover; el borde ocre marca el control sobre papel.
  al('--sobre-ocre', '--ocre', 4.5)
  al('--sobre-ocre', '--ocre-claro', 4.5)
  for (const fondo of ['--arcilla', '--papel']) al('--ocre-borde', fondo, 3)
  it('el ocre solo NO llega a 3:1 sobre la arcilla: por eso el botón lleva borde', () => {
    expect(contraste(c('--ocre'), c('--arcilla'))).toBeLessThan(3)
  })

  // Selección, foco y bordes de controles (WCAG 1.4.11).
  for (const color of ['--accent', '--focus', '--control']) for (const fondo of ['--ground', '--surface', '--raised']) al(color, fondo, 3)
  for (const fondo of ['--ground', '--surface']) al('--chart-1', fondo, 3)
  for (const fondo of ['--ground', '--surface']) al('--chart-3', fondo, 3)
  al('--text', '--ocre', 4.5)

  // Capa honda («Avanzado»).
  al('--sobre-honda', '--capa-honda', 4.5)
  al('--sobre-honda-2', '--capa-honda', 4.5)
  al('--sobre-honda', '--capa-honda-campo', 4.5)
  al('--capa-honda-borde', '--capa-honda', 3)
  al('--ocre', '--capa-honda', 3)
})

describe('contraste: superficies de basalto', () => {
  for (const texto of ['--mapa-texto', '--mapa-texto-2', '--mapa-muted', '--mapa-aviso'])
    for (const fondo of ['--mapa-fondo', '--mapa-elevado']) al(texto, fondo, 4.5)
  for (const color of ['--mapa-acento', '--laguna-clara', '--mapa-control', '--mapa-negativo'])
    for (const fondo of ['--mapa-fondo', '--mapa-elevado']) al(color, fondo, 3)

  it('el bloque de basalto reasigna los tokens neutros a los --mapa-*', () => {
    const bloque = /\.basalto,[^{]*\{([^}]*)\}/.exec(css)
    expect(bloque).not.toBeNull()
    for (const [nombre, valor] of [['--ground', '--mapa-fondo'], ['--surface', '--mapa-fondo'], ['--raised', '--mapa-elevado'],
      ['--text', '--mapa-texto'], ['--secondary', '--mapa-texto-2'], ['--muted', '--mapa-muted'], ['--control', '--mapa-control'],
      ['--accent', '--mapa-acento'], ['--warning', '--mapa-aviso'], ['--negative', '--mapa-negativo']])
      expect(bloque![1]).toMatch(new RegExp(`${nombre}:\\s*var\\(${valor}\\)`))
  })
})

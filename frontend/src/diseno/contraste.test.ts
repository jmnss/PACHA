import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { contraste } from './contraste'

const css = readFileSync(resolve(__dirname, 'tokens.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const v = new Map<string, string>()
for (const m of css.matchAll(/(--[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{6})\s*;/g)) v.set(m[1], m[2])
const c = (n: string): string => {
  const x = v.get(n)
  if (!x) throw new Error(`Falta ${n}`)
  return x
}

describe('contraste', () => {
  it('blanco sobre negro ≈ 21', () => {
    expect(contraste('#ffffff', '#000000')).toBeCloseTo(21, 1)
  })

  for (const texto of ['--text', '--secondary', '--muted'])
    for (const fondo of ['--ground', '--surface', '--raised'])
      it(`${texto} sobre ${fondo} ≥ 4,5`, () => {
        expect(contraste(c(texto), c(fondo))).toBeGreaterThanOrEqual(4.5)
      })

  for (const estado of ['positive', 'negative', 'warning', 'neutral'])
    it(`--pill-${estado}-ink sobre su fondo ≥ 4,5`, () => {
      expect(contraste(c(`--pill-${estado}-ink`), c(`--pill-${estado}-bg`))).toBeGreaterThanOrEqual(4.5)
    })

  it('--demo-ink sobre --demo-bg ≥ 4,5', () => {
    expect(contraste(c('--demo-ink'), c('--demo-bg'))).toBeGreaterThanOrEqual(4.5)
  })

  // Anillo de foco: var(--text) en componentes.css.
  for (const [nombre, color] of [['--accent', '--accent'], ['--control', '--control'], ['anillo de foco (--text)', '--text']])
    for (const fondo of ['--ground', '--surface'])
      it(`${nombre} sobre ${fondo} ≥ 3`, () => {
        expect(contraste(c(color), c(fondo))).toBeGreaterThanOrEqual(3)
      })

  // Los campos viven sobre --raised (docs/diseno.md, «Formularios y controles»): su borde también cumple ahí.
  it('--control sobre --raised ≥ 3', () => {
    expect(contraste(c('--control'), c('--raised'))).toBeGreaterThanOrEqual(3)
  })
})

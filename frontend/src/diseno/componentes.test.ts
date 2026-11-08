import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// Ningún valor suelto en componentes.css: todo sale de tokens.css (docs/diseno.md §6).
const css = ['componentes.css', '../graficos/graficos.css', '../tiempo/tiempo.css', '../comparador/comparador.css']
  .map((f) => readFileSync(resolve(__dirname, f), 'utf8'))
  .join('\n')
  .replace(/\/\*[\s\S]*?\*\//g, '')
const lineas = css.split('\n')

describe('componentes.css y graficos.css sin valores sueltos', () => {
  it('no contiene colores hex, rgb() ni rgba()', () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(css).not.toMatch(/\brgba?\(/)
  })
  it('no fija font-size ni line-height con unidades literales', () => {
    expect(css).not.toMatch(/font-size:\s*[\d.]+(px|rem|em)/)
    expect(css).not.toMatch(/line-height:\s*[\d.]+(px|rem|em)?\s*[;}]/)
  })
  it('solo usa px literales para 1px (líneas y bordes) y en @media (los breakpoints no admiten variables)', () => {
    const sueltos = lineas
      .filter((l) => !l.includes('@media'))
      .flatMap((l) => [...l.matchAll(/(?<![\w.-])(\d*\.?\d+)px/g)].map((m) => m[0]))
      .filter((v) => v !== '1px')
    expect(sueltos).toEqual([])
  })
})

describe('tokens.css: escala tipográfica de §5', () => {
  const tokens = readFileSync(resolve(__dirname, 'tokens.css'), 'utf8')
  it.each([12, 13, 14, 16, 20, 22, 26])('--fs-%i', (n) => {
    expect(tokens).toMatch(new RegExp(`--fs-${n}:\\s*${n}px`))
  })
  it.each([16, 20, 24, 28, 32])('--lh-%i', (n) => {
    expect(tokens).toMatch(new RegExp(`--lh-${n}:\\s*${n}px`))
  })
})

describe('móvil: pestañas y KPI', () => {
  it('las pestañas no se encogen (flex: none) para que no se solapen', () => {
    expect(css).toMatch(/\.pestanas__pestana\s*\{[^}]*flex:\s*none/)
  })
  it('el último KPI impar ocupa la fila entera y la unidad no se parte', () => {
    expect(css).toMatch(/\.franja-kpi__item:last-child:nth-child\(odd\)\s*\{[^}]*grid-column:\s*1\s*\/\s*-1/)
    expect(css).toMatch(/\.franja-kpi__unidad\s*\{[^}]*white-space:\s*nowrap/)
  })
})

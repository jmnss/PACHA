import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// docs/diseno.md §4 es la fuente de verdad: cada variable debe existir en tokens.css con el mismo valor.
const raiz = resolve(__dirname, '../../..')
const diseno = readFileSync(resolve(raiz, 'docs/diseno.md'), 'utf8')
const tokens = readFileSync(resolve(__dirname, 'tokens.css'), 'utf8')

function variables(css: string): Map<string, string> {
  const sinComentarios = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const mapa = new Map<string, string>()
  for (const m of sinComentarios.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    mapa.set(m[1], m[2].trim())
  }
  return mapa
}

const bloque = diseno.split('## 4.')[1].match(/```css\n([\s\S]*?)```/)
const esperadas = variables(bloque ? bloque[1] : '')
const reales = variables(tokens)

describe('tokens de diseño', () => {
  it('lee el bloque css de docs/diseno.md §4', () => {
    expect(esperadas.size).toBe(28)
  })

  for (const [nombre, valor] of esperadas) {
    it(`${nombre} = ${valor}`, () => {
      expect(reales.get(nombre)).toBe(valor)
    })
  }

  it('define las cifras tabulares', () => {
    expect(tokens).toMatch(/font-variant-numeric:\s*tabular-nums/)
  })
})

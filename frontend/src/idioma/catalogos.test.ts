import { describe, expect, it } from 'vitest'
import { en } from './catalogos/en'
import { es } from './catalogos/es'
import { qu } from './catalogos/qu'
import { VALIDADAS_QU } from './catalogos/validadas'

const vars = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
const catalogos = { es, en, qu } as Record<string, Record<string, string>>

describe('catálogos', () => {
  it('tienen las mismas claves', () => {
    const base = Object.keys(es).sort()
    expect(Object.keys(en).sort()).toEqual(base)
    expect(Object.keys(qu).sort()).toEqual(base)
  })
  it('no tienen valores vacíos', () => {
    for (const [id, cat] of Object.entries(catalogos))
      for (const [k, v] of Object.entries(cat)) expect(v.trim(), `${id}:${k}`).not.toBe('')
  })
  it('conservan las mismas variables', () => {
    for (const k of Object.keys(es))
      for (const id of ['en', 'qu']) expect(vars(catalogos[id][k]), `${id}:${k}`).toEqual(vars((es as Record<string, string>)[k]))
  })
  it('las validadas existen', () => {
    for (const k of VALIDADAS_QU) expect(k in qu, k).toBe(true)
  })
  it('ninguna clave se repite entre áreas (index.ts las une con «...» y la última pisaría a la primera)', () => {
    const modulos = import.meta.glob<Record<string, Record<string, string>>>('./catalogos/{es,en,qu}/*.ts', { eager: true })
    for (const idioma of ['es', 'en', 'qu']) {
      const dueno = new Map<string, string>()
      const repetidas: string[] = []
      for (const [ruta, mod] of Object.entries(modulos)) {
        if (!ruta.startsWith(`./catalogos/${idioma}/`) || ruta.endsWith('/index.ts')) continue
        for (const area of Object.values(mod))
          for (const k of Object.keys(area)) {
            if (dueno.has(k)) repetidas.push(`${idioma}:${k} (${dueno.get(k)} y ${ruta})`)
            else dueno.set(k, ruta)
          }
      }
      expect(repetidas).toEqual([])
      expect(dueno.size).toBe(Object.keys(catalogos[idioma]).length)
    }
  })
  it('registra el borrador', () => {
    const total = Object.keys(qu).length
    console.info(`qu en borrador: ${total - VALIDADAS_QU.size} de ${total}`)
  })
})

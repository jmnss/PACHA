// @vitest-environment node
import { spawnSync } from 'node:child_process'
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

// Ejecuta scripts/traducciones_csv.mjs sobre una copia de los catálogos, nunca sobre los reales.
const RAIZ = resolve(__dirname, '../../..')
const SCRIPT = join(RAIZ, 'scripts/traducciones_csv.mjs')
const CATALOGOS = resolve(__dirname, 'catalogos')

/** La fila de una clave con plantilla «{n}», sea cual sea su borrador actual. */
const FILA = /^comun\.capas\.otros,.*$/m

let dir: string
let catalogos: string
let csv: string

const correr = (...args: string[]) =>
  spawnSync(process.execPath, [SCRIPT, ...args], {
    encoding: 'utf8',
    env: { ...process.env, NISAR_CATALOGOS_DIR: catalogos },
  })

/** Ruta relativa → contenido de cada archivo de la copia de los catálogos. */
const instantanea = (raiz: string): Record<string, string> => {
  const salida: Record<string, string> = {}
  const recorrer = (d: string) => {
    for (const nombre of readdirSync(d)) {
      const ruta = join(d, nombre)
      if (statSync(ruta).isDirectory()) recorrer(ruta)
      else salida[ruta.slice(raiz.length)] = readFileSync(ruta, 'utf8')
    }
  }
  recorrer(raiz)
  return salida
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'traducciones-csv-'))
  catalogos = join(dir, 'catalogos')
  cpSync(CATALOGOS, catalogos, { recursive: true })
  csv = join(dir, 'kichwa.csv')
})

afterEach(() => rmSync(dir, { recursive: true, force: true }))

describe('traducciones_csv.mjs', () => {
  it('exporta con BOM, columnas fijas y filas ordenadas por clave', () => {
    const r = correr('exportar', csv)
    expect(r.status, r.stderr).toBe(0)
    const texto = readFileSync(csv, 'utf8')
    expect(texto.charCodeAt(0)).toBe(0xfeff)
    const lineas = texto.slice(1).split('\r\n').filter(Boolean)
    expect(lineas[0]).toBe('clave,es,en,qu,validada')
    const claves = lineas.slice(1).map((l) => l.split(',')[0])
    expect(claves).toEqual([...claves].sort())
    expect(texto).toContain('comun.capas.otros,{n} capas,')
  })

  it('el CSV del repositorio está al día con los catálogos', () => {
    expect(correr('exportar', csv).status).toBe(0)
    expect(readFileSync(csv, 'utf8')).toBe(readFileSync(join(RAIZ, 'docs/traduccion-kichwa.csv'), 'utf8'))
  })

  it('exportar → importar el mismo CSV no cambia ningún archivo', () => {
    expect(correr('exportar', csv).status).toBe(0)
    const antes = instantanea(catalogos)
    const r = correr('importar', csv)
    expect(r.status, r.stderr).toBe(0)
    expect(instantanea(catalogos)).toEqual(antes)
  })

  it('importa un cambio de kichwa y las validadas', () => {
    expect(correr('exportar', csv).status).toBe(0)
    const texto = readFileSync(csv, 'utf8')
      .replace(FILA, "comun.capas.otros,{n} capas,{n} layers,\"{n} capa's, \"\"ñuka\"\"\",si")
    writeFileSync(csv, texto)
    const r = correr('importar', csv)
    expect(r.status, r.stderr).toBe(0)
    expect(readFileSync(join(catalogos, 'qu/comun.ts'), 'utf8')).toContain("'comun.capas.otros': '{n} capa\\'s, \"ñuka\"',")
    expect(readFileSync(join(catalogos, 'validadas.ts'), 'utf8')).toContain("'comun.capas.otros'")
  })

  it('rechaza un CSV que borra una variable {n}, con mensaje en español y sin escribir', () => {
    expect(correr('exportar', csv).status).toBe(0)
    const texto = readFileSync(csv, 'utf8').replace(FILA, 'comun.capas.otros,{n} capas,{n} layers,capakuna,si')
    writeFileSync(csv, texto)
    const antes = instantanea(catalogos)
    const r = correr('importar', csv)
    expect(r.status).not.toBe(0)
    expect(r.stderr).toContain('comun.capas.otros')
    expect(r.stderr).toMatch(/variables/)
    expect(instantanea(catalogos)).toEqual(antes)
  })

  it('rechaza un CSV sin la columna qu o con una clave desconocida', () => {
    writeFileSync(csv, '﻿clave,es,en,validada\r\ncomun.capas.otros,a,b,no\r\n')
    let r = correr('importar', csv)
    expect(r.status).not.toBe(0)
    expect(r.stderr).toMatch(/columna/)
    writeFileSync(csv, '﻿clave,es,en,qu,validada\r\nno.existe,a,b,c,no\r\n')
    r = correr('importar', csv)
    expect(r.status).not.toBe(0)
    expect(r.stderr).toContain('no.existe')
  })
})

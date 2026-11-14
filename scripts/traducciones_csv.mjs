#!/usr/bin/env node
// Exporta e importa el borrador en kichwa para que lo revisen hablantes en una hoja de cálculo.
//
//   node scripts/traducciones_csv.mjs exportar [salida.csv]   → docs/traduccion-kichwa.csv por defecto
//   node scripts/traducciones_csv.mjs importar <archivo.csv>
//
// El CSV tiene las columnas clave,es,en,qu,validada (UTF-8 con BOM, una fila por clave, ordenado por
// clave). Al importar, cada `qu` distinto del catálogo se reescribe en `catalogos/qu/<área>.ts` y las
// filas con validada=si pasan a `VALIDADAS_QU` en `catalogos/validadas.ts`. Si algo no cuadra (falta una
// columna, clave desconocida, un `qu` vacío o con otras variables {x}), no se escribe nada.
//
// NISAR_CATALOGOS_DIR cambia la carpeta de catálogos (lo usan las pruebas sobre una copia).

import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const FRONTEND = join(RAIZ, 'frontend')
const CATALOGOS = resolve(process.env.NISAR_CATALOGOS_DIR || join(FRONTEND, 'src/idioma/catalogos'))
const CSV_POR_DEFECTO = join(RAIZ, 'docs/traduccion-kichwa.csv')
const COLUMNAS = ['clave', 'es', 'en', 'qu', 'validada']
const BOM = '﻿'

class ErrorCsv extends Error {}

// --- Lectura de los catálogos -------------------------------------------------------------------

/** Compila los catálogos con esbuild (de frontend/node_modules) y los importa. */
async function cargarCatalogos() {
  const esbuild = createRequire(join(FRONTEND, 'package.json'))('esbuild')
  const entrada = [
    "export { es } from './es'",
    "export { en } from './en'",
    "export { qu } from './qu'",
    "export { VALIDADAS_QU, CONTENIDO_LARGO_QU_VALIDADO } from './validadas'",
  ].join('\n')
  const r = await esbuild.build({
    stdin: { contents: entrada, resolveDir: CATALOGOS, loader: 'ts' },
    bundle: true,
    format: 'esm',
    platform: 'node',
    write: false,
    logLevel: 'silent',
  })
  const codigo = r.outputFiles[0].text
  return import('data:text/javascript;base64,' + Buffer.from(codigo).toString('base64'))
}

const variables = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',')

// --- CSV ----------------------------------------------------------------------------------------

const celda = (v) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)

/** Lee un CSV (RFC 4180, con o sin BOM, fin de línea \n o \r\n) a una lista de filas. */
function leerCsv(texto) {
  if (texto.startsWith(BOM)) texto = texto.slice(1)
  const filas = []
  let fila = []
  let valor = ''
  let entreComillas = false
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]
    if (entreComillas) {
      if (c === '"' && texto[i + 1] === '"') { valor += '"'; i++ }
      else if (c === '"') entreComillas = false
      else valor += c
    } else if (c === '"') entreComillas = true
    else if (c === ',') { fila.push(valor); valor = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++
      fila.push(valor); filas.push(fila); fila = []; valor = ''
    } else valor += c
  }
  if (entreComillas) throw new ErrorCsv('El CSV tiene unas comillas sin cerrar.')
  if (valor !== '' || fila.length) { fila.push(valor); filas.push(fila) }
  return filas.filter((f) => !(f.length === 1 && f[0] === ''))
}

// --- Exportar -----------------------------------------------------------------------------------

async function exportar(salida = CSV_POR_DEFECTO) {
  const { es, en, qu, VALIDADAS_QU } = await cargarCatalogos()
  const claves = Object.keys(es).sort()
  const lineas = [COLUMNAS.join(',')]
  for (const k of claves)
    lineas.push([k, es[k], en[k], qu[k], VALIDADAS_QU.has(k) ? 'si' : 'no'].map(celda).join(','))
  writeFileSync(salida, BOM + lineas.join('\r\n') + '\r\n', 'utf8')
  console.log(`Escrito ${salida}: ${claves.length} claves (${VALIDADAS_QU.size} validadas).`)
}

// --- Importar -----------------------------------------------------------------------------------

const literal = (v) => "'" + v.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, '\\n') + "'"
const escaparRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function textoValidadas(claves, contenidoLargo) {
  const conjunto = claves.length
    ? `new Set<Clave>([\n${claves.map((k) => `  '${k}',\n`).join('')}])`
    : 'new Set<Clave>()'
  return `import type { Clave } from '../traductor'

/** Claves de kichwa ya validadas por hablantes. Vacío: todo el kichwa es borrador. */
export const VALIDADAS_QU: ReadonlySet<Clave> = ${conjunto}

/** Pasa a true solo cuando hablantes validen el contenido largo (relatos, explicaciones). */
export const CONTENIDO_LARGO_QU_VALIDADO = ${contenidoLargo}
`
}

async function importar(archivo) {
  if (!archivo) throw new ErrorCsv('Falta el archivo: node scripts/traducciones_csv.mjs importar <archivo.csv>')
  const { es, qu, VALIDADAS_QU, CONTENIDO_LARGO_QU_VALIDADO } = await cargarCatalogos()
  const filas = leerCsv(readFileSync(archivo, 'utf8'))
  if (!filas.length) throw new ErrorCsv('El CSV está vacío.')
  const cabecera = filas[0].map((c) => c.trim())
  const faltan = COLUMNAS.filter((c) => !cabecera.includes(c))
  if (faltan.length) throw new ErrorCsv(`Al CSV le falta la columna ${faltan.join(', ')} (se esperan: ${COLUMNAS.join(', ')}).`)
  const col = Object.fromEntries(COLUMNAS.map((c) => [c, cabecera.indexOf(c)]))

  const problemas = []
  const cambios = new Map()
  const validadas = []
  const vistas = new Set()
  filas.slice(1).forEach((f, i) => {
    const n = i + 2
    const clave = (f[col.clave] ?? '').trim()
    const nuevo = f[col.qu] ?? ''
    const validada = (f[col.validada] ?? '').trim().toLowerCase()
    if (!(clave in es)) return problemas.push(`Fila ${n}: la clave «${clave}» no existe en los catálogos.`)
    if (vistas.has(clave)) return problemas.push(`Fila ${n}: la clave «${clave}» está repetida.`)
    vistas.add(clave)
    if (!nuevo.trim()) problemas.push(`Fila ${n}: «${clave}» tiene el kichwa vacío.`)
    else if (variables(nuevo) !== variables(qu[clave]))
      problemas.push(
        `Fila ${n}: «${clave}» cambia las variables entre llaves (antes {${variables(qu[clave])}}, ahora {${variables(nuevo)}}).`,
      )
    if (validada !== 'si' && validada !== 'no') problemas.push(`Fila ${n}: «${clave}» tiene validada=«${validada}»; debe ser si o no.`)
    if (validada === 'si') validadas.push(clave)
    if (nuevo !== qu[clave]) cambios.set(clave, nuevo)
  })
  if (problemas.length) throw new ErrorCsv(`No se importó nada:\n  ${problemas.join('\n  ')}`)

  // Prepara todos los archivos en memoria; solo se escriben si todo cuadra.
  const dirQu = join(CATALOGOS, 'qu')
  const archivos = new Map()
  for (const nombre of readdirSync(dirQu).filter((a) => a.endsWith('.ts') && a !== 'index.ts'))
    archivos.set(join(dirQu, nombre), readFileSync(join(dirQu, nombre), 'utf8'))
  const tocados = new Set()
  for (const [clave, nuevo] of cambios) {
    const patron = new RegExp(`(^\\s*'${escaparRegex(clave)}':\\s*)'(?:[^'\\\\\\n]|\\\\.)*'`, 'm')
    const ruta = [...archivos.keys()].find((r) => patron.test(archivos.get(r)))
    if (!ruta) throw new ErrorCsv(`No se importó nada: no encuentro la línea de «${clave}» en ${dirQu}.`)
    archivos.set(ruta, archivos.get(ruta).replace(patron, (_, inicio) => inicio + literal(nuevo)))
    tocados.add(ruta)
  }
  const antes = [...VALIDADAS_QU].sort().join('\n')
  const ahora = validadas.sort().join('\n')

  for (const ruta of tocados) writeFileSync(ruta, archivos.get(ruta), 'utf8')
  if (antes !== ahora)
    writeFileSync(join(CATALOGOS, 'validadas.ts'), textoValidadas(validadas, CONTENIDO_LARGO_QU_VALIDADO), 'utf8')
  console.log(
    `Importado ${archivo}: ${cambios.size} textos en kichwa cambiados en ${tocados.size} archivos; ` +
      `${validadas.length} claves validadas${antes !== ahora ? ' (validadas.ts reescrito)' : ''}.`,
  )
}

// --- Entrada ------------------------------------------------------------------------------------

const [orden, archivo] = process.argv.slice(2)
try {
  if (orden === 'exportar') await exportar(archivo)
  else if (orden === 'importar') await importar(archivo)
  else throw new ErrorCsv('Uso: node scripts/traducciones_csv.mjs exportar [salida.csv] | importar <archivo.csv>')
} catch (e) {
  console.error(e instanceof ErrorCsv ? e.message : `Error inesperado: ${e?.stack ?? e}`)
  process.exit(1)
}

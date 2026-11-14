import { esReal, type Origen } from '../diseno/origen'
import type { CodigoIdioma } from '../idioma/idiomas'

export type Celda = string | number | boolean | null | undefined

const DESCONOCIDA = 'desconocida'

/** Líneas de comentario de origen. Fail-safe: solo `tipo === 'real'` exacto omite la advertencia; con
 * cualquier otro valor (o sin origen) se marca «sintético (no verificado)» y se añade la advertencia.
 * No hay forma de omitirla para datos sintéticos (docs/diseno.md §8). Las seis primeras líneas son
 * origen, fuente, generador, semilla, fecha y advertencia; `producto` va después y `# idioma` cierra cuando el llamador
 * indica el idioma (sin él, las seis líneas históricas quedan idénticas).
 * Las líneas de máquina se quedan siempre en español. */
export function lineasOrigen(o: Origen | null | undefined, idioma?: CodigoIdioma): string[] {
  const real = esReal(o)
  const etiqueta = real ? 'real' : o?.tipo === 'sintetico' ? 'sintético' : 'sintético (no verificado)'
  const l = [`# origen: ${etiqueta}`, `# fuente: ${limpia(o?.fuente)}`]
  if (o?.generador) l.push(`# generador: ${limpia(o.version ? `${o.generador} v${o.version}` : o.generador)}`)
  if (o?.semilla !== null && o?.semilla !== undefined) l.push(`# semilla: ${limpia(o.semilla)}`)
  l.push(`# fecha de generación: ${limpia(o?.fecha_generacion)}`)
  if (!real) l.push('# DATOS DE DEMOSTRACIÓN: no son observaciones reales de NISAR')
  if (o?.producto) l.push(`# producto: ${limpia(o.producto)}`)
  if (idioma) l.push(`# idioma: ${idioma}`)
  return l
}

/** Un comentario ocupa una sola línea: los saltos del texto se aplanan; lo ausente es «desconocida». */
function limpia(t: unknown): string {
  if (t === null || t === undefined || t === '') return DESCONOCIDA
  return String(t).replace(/\s*[\r\n]+\s*/g, ' ')
}

/** Escapa una celda: null/undefined → vacío; números con punto decimal; texto que empieza por = + - @
 * (con o sin espacios delante) o por tabulador/CR se prefija con comilla simple contra inyección de fórmulas; comillas, comas y saltos
 * de línea se entrecomillan. */
export function celdaCsv(v: Celda): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : ''
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  let t = String(v)
  if (/^[ ]*[=+\-@]|^[\t\r]/.test(t)) t = `'${t}`
  return /[",\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t
}

/** CSV con las líneas de origen al principio, la cabecera de columnas y las filas. Saltos de línea \n. */
export function aCsv(filas: Record<string, Celda>[], columnas: string[], origen: Origen | null | undefined, idioma?: CodigoIdioma): string {
  const cuerpo = filas.map((f) => columnas.map((c) => celdaCsv(f[c])).join(','))
  return [...lineasOrigen(origen, idioma), columnas.map(celdaCsv).join(','), ...cuerpo].join('\n') + '\n'
}

/** Descarga un CSV. Decisión: `aCsv` devuelve texto puro (sin BOM) para que las pruebas y otras
 * herramientas lo lean tal cual; `descargarCsv` antepone el BOM UTF-8 (U+FEFF) por defecto porque la
 * descarga está pensada para abrirse en Excel, que sin BOM estropea los acentos. `bom: false` lo quita. */
export function descargarCsv(nombre: string, contenido: string, bom = true): void {
  const url = URL.createObjectURL(new Blob([bom ? '﻿' : '', contenido], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  a.click()
  URL.revokeObjectURL(url)
}

import type { Origen } from '../diseno/origen'

export type Celda = string | number | boolean | null | undefined

/** Líneas de comentario de origen. Siempre se escriben; para datos sintéticos incluyen la advertencia
 * y no hay forma de omitirla (docs/diseno.md §8). */
export function lineasOrigen(o: Origen): string[] {
  const l = [`# origen: ${o.tipo === 'sintetico' ? 'sintético' : 'real'}`, `# fuente: ${limpia(o.fuente)}`]
  if (o.producto) l.push(`# producto: ${limpia(o.producto)}`)
  if (o.generador) l.push(`# generador: ${limpia(o.version ? `${o.generador} v${o.version}` : o.generador)}`)
  if (o.semilla !== null && o.semilla !== undefined) l.push(`# semilla: ${o.semilla}`)
  l.push(`# fecha de generación: ${limpia(o.fecha_generacion)}`)
  if (o.tipo === 'sintetico') l.push('# DATOS DE DEMOSTRACIÓN: no son observaciones reales de NISAR')
  return l
}

/** Un comentario ocupa una sola línea: los saltos del texto se aplanan. */
function limpia(t: string): string {
  return t.replace(/\s*[\r\n]+\s*/g, ' ')
}

/** Escapa una celda: null/undefined → vacío; números con punto decimal; texto que empieza por = + - @
 * (o tabulador/CR) se prefija con comilla simple contra inyección de fórmulas; comillas, comas y saltos
 * de línea se entrecomillan. */
export function celdaCsv(v: Celda): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : ''
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  let t = v
  if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`
  return /[",\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t
}

/** CSV con las líneas de origen al principio, la cabecera de columnas y las filas. Saltos de línea \n. */
export function aCsv(filas: Record<string, Celda>[], columnas: string[], origen: Origen): string {
  const cuerpo = filas.map((f) => columnas.map((c) => celdaCsv(f[c])).join(','))
  return [...lineasOrigen(origen), columnas.map(celdaCsv).join(','), ...cuerpo].join('\n') + '\n'
}

/** Descarga un CSV. Con `bom` (por defecto sí) antepone el BOM UTF-8 (U+FEFF) para que Excel reconozca
 * los acentos; las herramientas que no lo esperan pueden pedir `bom: false`. */
export function descargarCsv(nombre: string, contenido: string, bom = true): void {
  const url = URL.createObjectURL(new Blob([bom ? '﻿' : '', contenido], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  a.click()
  URL.revokeObjectURL(url)
}

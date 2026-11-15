import { esReal, type Origen } from '../diseno/origen'
import { traductor, type T } from '../idioma/traductor'
import { COLORES_EXPORTACION } from '../mapa/colores'

/** Alto de una línea de texto de la franja (--fs-12) y relleno vertical total: una línea → 24 px,
 * dos líneas → 36 px (alto = 12·n + 12). La franja se AÑADE bajo la imagen. */
export const ALTO_LINEA = 12
export const ALTO_FRANJA = 24
const MARGEN = 8
const FUENTE_RESPALDO = "'Public Sans', system-ui, sans-serif"

export type Medir = (texto: string) => number

/** Parte el texto por palabras en las líneas necesarias para que quepa en `ancho` (sin aplastarlo). */
export function partirTexto(texto: string, ancho: number, medir: Medir): string[] {
  const lineas: string[] = []
  let actual = ''
  for (const palabra of texto.split(' ')) {
    const prueba = actual ? `${actual} ${palabra}` : palabra
    if (actual && medir(prueba) > ancho) {
      lineas.push(actual)
      actual = palabra
    } else {
      actual = prueba
    }
  }
  lineas.push(actual)
  return lineas
}

/** Qué se dibuja en la franja: líneas de texto, alto y colores (de --demo-bg, --demo-ink y --font-sans).
 * Fail-safe: solo `tipo === 'real'` exacto lleva la fuente en lugar de la advertencia. Función pura
 * salvo por la lectura de variables CSS. */
export function pixelesFranja(ancho: number, origen: Origen | null | undefined, medir: Medir = (t) => t.length * 7, t: T = traductor('es').t) {
  const css = typeof document !== 'undefined' ? getComputedStyle(document.documentElement) : null
  const leer = (v: string, respaldo: string) => css?.getPropertyValue(v).trim() || respaldo
  const texto = esReal(origen) ? String(origen?.fuente || t('exportar.franja.fuente_desconocida')) : t('origen.sello.simulacion')
  const lineas = partirTexto(texto, Math.max(0, ancho - 2 * MARGEN), medir)
  return {
    ancho,
    alto: ALTO_LINEA * lineas.length + ALTO_LINEA,
    fondo: leer('--demo-bg', COLORES_EXPORTACION.demoBg),
    tinta: leer('--demo-ink', COLORES_EXPORTACION.demoInk),
    fuente: `600 ${ALTO_LINEA}px ${leer('--font-sans', FUENTE_RESPALDO)}`,
    lineas,
  }
}

/** Copia el lienzo y le añade bajo la imagen una franja con el origen: 24 px si el texto cabe en una
 * línea, 36 px si hace falta partirlo en dos (el resultado mide alto + franja). No hay parámetro para
 * omitirla. */
export function aPng(lienzo: HTMLCanvasElement, origen: Origen | null | undefined, t: T = traductor('es').t): Promise<Blob> {
  const salida = document.createElement('canvas')
  const ctx = salida.getContext('2d')
  if (!ctx) return Promise.reject(new Error(t('exportar.error.lienzo')))
  // La fuente debe estar puesta antes de medir.
  const base = pixelesFranja(lienzo.width, origen, undefined, t)
  ctx.font = base.fuente
  const f = pixelesFranja(lienzo.width, origen, (x) => ctx.measureText(x).width, t)
  salida.width = lienzo.width
  salida.height = lienzo.height + f.alto
  ctx.drawImage(lienzo, 0, 0)
  ctx.fillStyle = f.fondo
  ctx.fillRect(0, lienzo.height, f.ancho, f.alto)
  ctx.fillStyle = f.tinta
  ctx.font = f.fuente
  ctx.textBaseline = 'middle'
  f.lineas.forEach((l, i) => ctx.fillText(l, MARGEN, lienzo.height + ALTO_LINEA + i * ALTO_LINEA))
  return new Promise((ok, mal) =>
    salida.toBlob((b) => (b ? ok(b) : mal(new Error(t('exportar.error.png')))), 'image/png'),
  )
}

/** Descarga un Blob (PNG) con el nombre dado. */
export function descargarPng(nombre: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  a.click()
  URL.revokeObjectURL(url)
}

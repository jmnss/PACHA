import type { Origen } from '../diseno/origen'
import { COLORES_EXPORTACION } from '../mapa/colores'

export const ALTO_FRANJA = 24
const TEXTO_DEMO = 'DATOS DE DEMOSTRACIÓN · no son observaciones reales de NISAR'

/** Qué se dibuja en la franja: texto y colores. Función pura. Sintético → siempre la advertencia;
 * real → la fuente. */
export function pixelesFranja(ancho: number, origen: Origen) {
  const css = typeof document !== 'undefined' ? getComputedStyle(document.documentElement) : null
  const color = (v: string, respaldo: string) => css?.getPropertyValue(v).trim() || respaldo
  return {
    ancho,
    alto: ALTO_FRANJA,
    fondo: color('--demo-bg', COLORES_EXPORTACION.demoBg),
    tinta: color('--demo-ink', COLORES_EXPORTACION.demoInk),
    texto: origen.tipo === 'sintetico' ? TEXTO_DEMO : origen.fuente,
  }
}

/** Copia el lienzo y le añade bajo la imagen una franja de 24 px con el origen (el resultado mide
 * alto + 24). No hay parámetro para omitirla. */
export function aPng(lienzo: HTMLCanvasElement, origen: Origen): Promise<Blob> {
  const salida = document.createElement('canvas')
  salida.width = lienzo.width
  salida.height = lienzo.height + ALTO_FRANJA
  const ctx = salida.getContext('2d')
  if (!ctx) return Promise.reject(new Error('No se pudo crear el lienzo de exportación.'))
  const f = pixelesFranja(lienzo.width, origen)
  ctx.drawImage(lienzo, 0, 0)
  ctx.fillStyle = f.fondo
  ctx.fillRect(0, lienzo.height, f.ancho, f.alto)
  ctx.fillStyle = f.tinta
  ctx.font = '600 12px "Public Sans", sans-serif'
  ctx.textBaseline = 'middle'
  ctx.fillText(f.texto, 8, lienzo.height + f.alto / 2, Math.max(0, f.ancho - 16))
  return new Promise((ok, mal) =>
    salida.toBlob((b) => (b ? ok(b) : mal(new Error('No se pudo generar el PNG.'))), 'image/png'),
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

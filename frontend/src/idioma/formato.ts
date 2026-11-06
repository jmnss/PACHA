import type { CodigoIdioma } from './idiomas'
import type { T } from './traductor'

function locale(idioma: CodigoIdioma): string {
  return idioma === 'en' ? 'en' : 'es-EC'
}

export function formatoNumero(idioma: CodigoIdioma, n: number, op?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(locale(idioma), op).format(n)
}

export function formatoFecha(
  idioma: CodigoIdioma,
  fecha: Date | string,
  estilo: 'larga' | 'mes-anio' | 'corta',
  t: T,
): string {
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha
  if (Number.isNaN(d.getTime())) return '—'
  const anio = d.getUTCFullYear()
  const mes = d.getUTCMonth() + 1
  const dia = d.getUTCDate()
  if (estilo === 'corta') {
    return `${String(anio).padStart(4, '0')}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
  }
  if (idioma === 'qu') {
    const nombreMes = t(`fecha.mes.${mes}` as Parameters<T>[0])
    return estilo === 'larga' ? `${dia} ${nombreMes} ${anio}` : `${nombreMes} ${anio}`
  }
  const op: Intl.DateTimeFormatOptions =
    estilo === 'larga' ? { dateStyle: 'long', timeZone: 'UTC' } : { month: 'long', year: 'numeric', timeZone: 'UTC' }
  return new Intl.DateTimeFormat(locale(idioma), op).format(d)
}

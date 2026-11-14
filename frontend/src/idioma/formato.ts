import type { CodigoIdioma } from './idiomas'
import type { T } from './traductor'

function locale(idioma: CodigoIdioma): string {
  return idioma === 'en' ? 'en' : 'es-EC'
}

/** Hora (hh:mm) de un instante en milisegundos, o undefined si no hay dato. El kichwa usa la hora de es-EC
 * (CLDR da a «qu» un «a.m.» que no corresponde). */
export function formatoHora(idioma: CodigoIdioma, ms: number): string | undefined {
  return ms > 0 ? new Date(ms).toLocaleTimeString(locale(idioma), { hour: '2-digit', minute: '2-digit' }) : undefined
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

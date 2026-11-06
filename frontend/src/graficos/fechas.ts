import type { CodigoIdioma } from '../idioma/idiomas'
import { traductor, type T } from '../idioma/traductor'

const ABREV = (locale: string, op: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, { ...op, timeZone: 'UTC' })
// Kichwa: los meses siguen en español (ver docs/guia-traduccion-kichwa.md).
const locale = (idioma: CodigoIdioma) => (idioma === 'en' ? 'en' : 'es')
const FORMATOS = {
  mes: (i: CodigoIdioma) => ABREV(locale(i), { day: 'numeric', month: 'short' }),
  mesAnio: (i: CodigoIdioma) => ABREV(locale(i), { day: 'numeric', month: 'short', year: 'numeric' }),
  hora: (i: CodigoIdioma) => ABREV(locale(i), { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }),
}

/** Interpreta un ISO como UTC también cuando no trae zona («2026-04-12T06:00»). NaN si no es válido. */
export function parseInstante(iso: string): number {
  const conHora = /T\d{2}:\d{2}/.test(iso)
  const conZona = /(Z|[+-]\d{2}:?\d{2})$/i.test(iso)
  return Date.parse(conHora && !conZona ? `${iso}Z` : iso)
}

/** «12 abr»; con año si el rango pasa de un año; con hora («12 abr 06:00 UTC») si es menor de 2 días. */
export function fechaEje(
  t: number,
  opc: { conAnio?: boolean; conHora?: boolean } = {},
  idioma: CodigoIdioma = 'es',
): string {
  const d = new Date(t)
  const fmt = opc.conAnio ? FORMATOS.mesAnio(idioma) : FORMATOS.mes(idioma)
  const base = fmt.format(d).replace(/\./g, '').replace(/ de /g, ' ')
  return opc.conHora ? `${base} ${FORMATOS.hora(idioma).format(d)} UTC` : base
}

/** La serie «verdad…» solo se rotula «verdad sintética» cuando el origen es sintético. */
export const esVerdad = (nombre: string, sintetico: boolean) =>
  sintetico && nombre.trim().toLowerCase().startsWith('verdad')
export const rotulo = (nombre: string, sintetico: boolean, t: T = traductor('es').t) =>
  esVerdad(nombre, sintetico) ? t('piezas.grafico.verdad_sintetica') : nombre

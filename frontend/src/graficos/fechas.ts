const MES = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const MES_ANIO = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const HORA = new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'UTC' })

/** Interpreta un ISO como UTC también cuando no trae zona («2026-04-12T06:00»). NaN si no es válido. */
export function parseInstante(iso: string): number {
  const conHora = /T\d{2}:\d{2}/.test(iso)
  const conZona = /(Z|[+-]\d{2}:?\d{2})$/i.test(iso)
  return Date.parse(conHora && !conZona ? `${iso}Z` : iso)
}

/** «12 abr»; con año si el rango pasa de un año; con hora («12 abr 06:00 UTC») si es menor de 2 días. */
export function fechaEje(t: number, opc: { conAnio?: boolean; conHora?: boolean } = {}): string {
  const d = new Date(t)
  const base = (opc.conAnio ? MES_ANIO : MES).format(d).replace(/\./g, '').replace(/ de /g, ' ')
  return opc.conHora ? `${base} ${HORA.format(d)} UTC` : base
}

/** La serie «verdad…» solo se rotula «verdad sintética» cuando el origen es sintético. */
export const esVerdad = (nombre: string, sintetico: boolean) =>
  sintetico && nombre.trim().toLowerCase().startsWith('verdad')
export const rotulo = (nombre: string, sintetico: boolean) => (esVerdad(nombre, sintetico) ? 'verdad sintética' : nombre)

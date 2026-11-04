const MES = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const MES_ANIO = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
/** «12 abr» (con año si el rango pasa de un año). */
export function fechaEje(t: number, conAnio = false): string {
  return (conAnio ? MES_ANIO : MES).format(new Date(t)).replace(/\./g, '').replace(/ de /g, ' ')
}

export const esVerdad = (nombre: string) => nombre.trim().toLowerCase().startsWith('verdad')
export const rotulo = (nombre: string) => (esVerdad(nombre) ? 'verdad sintética' : nombre)


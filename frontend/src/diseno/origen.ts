import type { Escenario } from '../api/consultas'

export type Origen = Escenario['origen']

/** Honestidad fail-safe: solo `tipo === 'real'` exacto es real. Cualquier otro valor (desconocido,
 * undefined, origen ausente) se trata como sintético / de demostración. */
export function esReal(o: Origen | null | undefined): boolean {
  return o?.tipo === 'real'
}

export function fechaCorta(iso: string): string {
  return String(iso ?? 'desconocida').slice(0, 10)
}

/** Texto del sello según docs/diseno.md §8. Real sin generador: solo fuente y fecha. */
export function textoSello(o: Origen | null | undefined): string {
  if (!o) return 'Sintético (no verificado)'
  const generador = o.generador ? (o.version ? `generador v${o.version}` : 'generador') : null
  if (!esReal(o)) {
    const partes = [o.tipo === 'sintetico' ? 'Sintético' : 'Sintético (no verificado)', o.fuente ?? 'desconocida']
    if (generador) partes.push(generador)
    if (o.semilla !== null && o.semilla !== undefined) partes.push(`semilla ${o.semilla}`)
    partes.push(`generado ${fechaCorta(o.fecha_generacion)}`)
    return partes.join(' · ')
  }
  const partes = ['Real', o.fuente ?? 'desconocida']
  if (o.producto) partes.push(o.producto)
  if (generador) partes.push(generador)
  partes.push(fechaCorta(o.fecha_generacion))
  return partes.join(' · ')
}

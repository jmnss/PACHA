import type { Escenario } from '../api/consultas'

export type Origen = Escenario['origen']

export function fechaCorta(iso: string): string {
  return iso.slice(0, 10)
}

/** Texto del sello según docs/diseno.md §8. Real sin generador: solo fuente y fecha. */
export function textoSello(o: Origen): string {
  const generador = o.generador ? (o.version ? `generador v${o.version}` : 'generador') : null
  if (o.tipo === 'sintetico') {
    const partes = ['Sintético', o.fuente]
    if (generador) partes.push(generador)
    if (o.semilla !== null && o.semilla !== undefined) partes.push(`semilla ${o.semilla}`)
    partes.push(`generado ${fechaCorta(o.fecha_generacion)}`)
    return partes.join(' · ')
  }
  const partes = ['Real', o.fuente]
  if (o.producto) partes.push(o.producto)
  if (generador) partes.push(generador)
  partes.push(fechaCorta(o.fecha_generacion))
  return partes.join(' · ')
}

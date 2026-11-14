import type { Escenario } from '../api/consultas'
import { traductor, type T } from '../idioma/traductor'

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
export function textoSello(o: Origen | null | undefined, t: T = traductor('es').t): string {
  if (!o) return t('origen.sello.sintetico_no_verificado')
  const generador = o.generador
    ? (o.version ? t('origen.sello.generador_version', { version: String(o.version) }) : t('origen.sello.generador'))
    : null
  const fuente = o.fuente ?? t('origen.sello.desconocida')
  const fecha = o.fecha_generacion == null ? t('origen.sello.desconocida') : fechaCorta(o.fecha_generacion)
  if (!esReal(o)) {
    const partes = [
      o.tipo === 'sintetico' ? t('origen.sello.sintetico') : t('origen.sello.sintetico_no_verificado'),
      fuente,
    ]
    if (generador) partes.push(generador)
    if (o.semilla !== null && o.semilla !== undefined) partes.push(t('origen.sello.semilla', { semilla: String(o.semilla) }))
    partes.push(t('origen.sello.generado', { fecha }))
    return partes.join(' · ')
  }
  const partes = [t('origen.sello.real'), fuente]
  if (o.producto) partes.push(o.producto)
  if (generador) partes.push(generador)
  partes.push(fecha)
  return partes.join(' · ')
}

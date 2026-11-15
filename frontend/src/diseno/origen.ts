import type { Escenario } from '../api/consultas'
import { traductor, type T } from '../idioma/traductor'

export type Origen = Escenario['origen']

/** Honestidad fail-safe: solo `tipo === 'real'` exacto es real. Cualquier otro valor (desconocido,
 * undefined, origen ausente) se trata como simulación. */
export function esReal(o: Origen | null | undefined): boolean {
  return o?.tipo === 'real'
}

export function fechaCorta(iso: string): string {
  return String(iso ?? 'desconocida').slice(0, 10)
}

/** Texto del sello (docs/diseno.md §8).
 * Real de NISAR: «NISAR · GCOV · HH/HV · <fecha> · procesado por el equipo PACHA», con granulo y madurez solo si vienen.
 * Sintético: solo simulación («Simulación»; con la semilla si la hay). */
export function textoSello(o: Origen | null | undefined, t: T = traductor('es').t): string {
  if (!esReal(o)) {
    const partes = [t('origen.sello.simulacion')]
    if (o?.semilla !== null && o?.semilla !== undefined) partes.push(t('origen.sello.semilla', { semilla: String(o.semilla) }))
    return partes.join(' · ')
  }
  const real = o as NonNullable<Origen>
  const pr = real.procedencia
  const esNisar = real.clase === 'nisar'
  const propio = esNisar || real.clase === 'otro_sensor'
  const partes = [esNisar ? t('origen.sello.nisar') : real.fuente]
  const producto = pr?.producto ?? real.producto
  if (producto) partes.push(producto)
  if (pr?.polarizaciones?.length) partes.push(pr.polarizaciones.join('/'))
  // Fecha de ADQUISICIÓN (solo el día): la de generación del derivado no se presenta como tal.
  const fecha = pr ? pr.fecha_adquisicion ?? pr.fecha : real.fecha_generacion
  if (fecha) partes.push(fechaCorta(fecha))
  if (propio) partes.push(t('origen.sello.procesado'))
  if (pr?.granulos?.length) partes.push(t('origen.sello.granulo', { id: pr.granulos.join(', ') }))
  if (pr?.madurez) partes.push(t('origen.sello.madurez', { nivel: pr.madurez }))
  return partes.join(' · ')
}

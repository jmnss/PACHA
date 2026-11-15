import type { origen as esOrigen } from '../es/origen'

export const origen: Record<keyof typeof esOrigen, string> = {
  'origen.sello.simulacion': 'Simulation',
  'origen.sello.nisar': 'NISAR',
  'origen.sello.procesado': 'processed by the PACHA team',
  'origen.sello.granulo': 'granule {id}',
  'origen.sello.madurez': 'maturity {nivel}',
  'origen.sello.semilla': 'seed {semilla}',
  'origen.notas.aviso':
    'Simulation model notes · details about NISAR (products, geometry, bands) are pending confirmation against the official documentation.',
  'origen.notas.sin_verificar': '(unverified)',
  'origen.leyenda.titulo': 'Legend',
  'origen.leyenda.titulo_unidad': 'Legend, {unidad}',
  'origen.leyenda.titulo_rango': 'Legend, {unidad}, from {desde} to {hasta}',
  'origen.leyenda.transparente': '(transparent)',
  'origen.leyenda.gris_menos': 'darker',
  'origen.leyenda.gris_mas': 'lighter',
  'origen.leyenda.secuencial_menos': 'less',
  'origen.leyenda.secuencial_mas': 'more',
  'origen.leyenda.divergente_menos': 'weaker signal',
  'origen.leyenda.desplazamiento_menos': 'moving away',
  'origen.leyenda.desplazamiento_mas': 'toward the satellite',
  'origen.leyenda.divergente_mas': 'stronger signal',
}

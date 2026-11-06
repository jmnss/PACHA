import type { origen as esOrigen } from '../es/origen'

export const origen: Record<keyof typeof esOrigen, string> = {
  'origen.sello.sintetico': 'Synthetic',
  'origen.sello.sintetico_no_verificado': 'Synthetic (unverified)',
  'origen.sello.real': 'Real',
  'origen.sello.desconocida': 'unknown',
  'origen.sello.generador': 'generator',
  'origen.sello.generador_version': 'generator v{version}',
  'origen.sello.semilla': 'seed {semilla}',
  'origen.sello.generado': 'generated {fecha}',
  'origen.notas.aviso':
    'Demonstration model notes · details about NISAR (products, geometry, bands) are pending confirmation against the official documentation.',
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

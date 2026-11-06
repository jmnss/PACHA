import type { origen as esOrigen } from '../es/origen'

// Borrador en kichwa unificado, pendiente de revisión por hablantes.
export const origen: Record<keyof typeof esOrigen, string> = {
  'origen.sello.sintetico': 'Rurashka',
  'origen.sello.sintetico_no_verificado': 'Rurashka (mana chiqanyachishka)',
  'origen.sello.real': 'Chiqan',
  'origen.sello.desconocida': 'mana yachashka',
  'origen.sello.generador': 'rurachik',
  'origen.sello.generador_version': 'rurachik v{version}',
  'origen.sello.semilla': 'muju {semilla}',
  'origen.sello.generado': 'rurashka puncha {fecha}',
  'origen.notas.aviso':
    'Rikuchiy modelopa willachiykuna · NISAR-manta willaykuna (productos, geometría, bandakuna) manaraka chiqanyachishkachu, kamachik panka-wan chiqanyachina kan.',
  'origen.notas.sin_verificar': '(mana chiqanyachishka)',
  'origen.leyenda.titulo': 'Rikuchik',
  'origen.leyenda.titulo_unidad': 'Rikuchik, {unidad}',
  'origen.leyenda.titulo_rango': 'Rikuchik, {unidad}, {desde}-manta {hasta}-kama',
  'origen.leyenda.transparente': '(transparente)',
  'origen.leyenda.gris_menos': 'yanayashka',
  'origen.leyenda.gris_mas': 'yurakyashka',
  'origen.leyenda.secuencial_menos': 'pishi',
  'origen.leyenda.secuencial_mas': 'achka',
  'origen.leyenda.divergente_menos': 'pishi señal',
  'origen.leyenda.desplazamiento_menos': 'alejándose',
  'origen.leyenda.desplazamiento_mas': 'hacia el satélite',
  'origen.leyenda.divergente_mas': 'achka señal',
}

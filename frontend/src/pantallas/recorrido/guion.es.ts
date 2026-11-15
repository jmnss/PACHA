/**
 * Guion del recorrido: datos, sin lógica científica. Cada paso incrusta una pantalla real.
 * Todo el texto es de demostración: se redacta como ejemplo, nunca como hallazgo sobre un lugar real.
 */
export interface Paso {
  id: string
  titulo: string
  texto: string
  /** Ruta de la app (sin `incrustado`; lo añade el recorrido). */
  ruta: string
  segundos: number
}

/** Texto de un paso en un idioma: lo único que cambia entre idiomas. */
export interface TextoPaso { id: string; titulo: string; texto: string }

export const guionEs: Paso[] = [
  {
    id: 'problema', titulo: 'Un río crece y nadie ve hasta dónde',
    texto: 'Ejemplo ilustrativo en la Costa baja de Ecuador: cuando una inundación llega, las nubes suelen cubrir el cielo justo cuando más hace falta mirar.',
    ruta: '/explorar/historias', segundos: 12,
  },
  {
    id: 'nubes', titulo: 'La nube no lo detiene',
    texto: 'Un radar emite su propia señal, de día y de noche. Sube las nubes: la imagen óptica se pierde y el radar sigue viendo la inundación.',
    ruta: '/aprender/laboratorio?nubes=70', segundos: 14,
  },
  {
    id: 'polarizacion', titulo: 'Cada polarización cuenta algo distinto',
    texto: 'El agua abierta, el agua bajo los árboles y un bosque quemado responden distinto según cómo se emite y se recibe la onda.',
    ruta: '/aprender/laboratorio?vista=polarizacion', segundos: 14,
  },
  {
    id: 'mapa', titulo: 'Del dato al mapa de cambio',
    texto: 'En el Observatorio, dos pasadas se convierten en un mapa de qué cambió, con su serie en el tiempo y la medición de un cuadrante.',
    ruta: '/explorar/observatorio', segundos: 14,
  },
  {
    id: 'incendio', titulo: 'Otro cambio, otra señal',
    texto: 'Un incendio en la Sierra: la polarización cruzada (HV) cae donde el bosque pierde estructura. Desliza para comparar antes y después.',
    ruta: '/explorar/historias?historia=incendio', segundos: 12,
  },
  {
    id: 'simulador', titulo: 'Y si pasa mañana',
    texto: 'El Simulador de eventos lanza un terremoto, una erupción o un incendio sobre el relieve real de Ecuador y muestra lo que vería un radar.',
    ruta: '/simular', segundos: 12,
  },
]

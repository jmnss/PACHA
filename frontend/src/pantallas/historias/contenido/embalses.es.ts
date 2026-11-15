import { t, type ContenidoHistoria } from './tipos'

/**
 * Embalses y lluvia (Mazar y Daule-Peripa) con las imágenes NISAR del equipo. Las cifras, la ficha con fuentes y las
 * lecturas (hipótesis) vienen de la API; aquí solo va el texto de cada paso.
 */
export const embalsesEs: ContenidoHistoria = {
  clave: 'embalses',
  historiaApi: 'embalse',
  sitios: ['mazar', 'daule-peripa'],
  etiqueta: 'Embalses y lluvia',
  titulo: 'Embalses y lluvia',
  resumen: 'Cuánta agua guarda un embalse y cómo lo ve un radar que atraviesa las nubes.',
  polarizacion: 'HH',
  pasos: {
    datos: {
      titular: 'Cuánta agua hay en el embalse',
      frase: 'El equipo marcó dónde hay agua en cada imagen del radar; de esa marca sale la superficie del embalse.',
      cifra: 'Superficie de agua el {fecha}',
      vista: 'Máscara de agua del equipo en cada fecha: la parte azul es agua.',
      detalle: [
        ['La máscara separa cada píxel en «agua» y «no agua». La superficie es la suma de los píxeles de agua dentro del contorno del embalse, medida en la rejilla original.'],
        ['Las imágenes son de NISAR (producto GCOV, ', t('bandaL'), '), procesadas y segmentadas por el equipo PACHA.'],
      ],
    },
    satelite: {
      titular: 'El agua en calma se ve oscura',
      frase: 'El agua lisa refleja la señal del radar lejos del satélite, así que casi no vuelve nada.',
      cifra: 'Señal del agua en {pol} el {fecha} (mediana)',
      vista: 'Señal del radar en {pol}, antes y después: más oscuro = agua lisa.',
      detalle: [
        ['Un ', t('radar'), ' emite su propia señal y mide lo que vuelve, de día y de noche y a través de las nubes. Lo que vuelve de cada punto se llama ', t('gamma0'), ' y se mide en ', t('dB'), '.'],
        ['La onda de ', t('bandaL'), ' es larga. Sobre el agua en calma rebota como en un espejo y se aleja; sobre la orilla, la tierra y la vegetación esparcen la señal y una parte vuelve. Por eso el borde del agua se ve en ', t('HH'), ' y en ', t('HV'), ', las dos orientaciones de la onda (la ', t('polarizacion'), ') de estas imágenes.'],
      ],
    },
    simular: {
      titular: 'Prueba el radar en el Simulador',
      frase: 'En el Simulador puedes crear un cambio de ejemplo y ver cómo lo vería el radar.',
      cifra: '',
      vista: 'La máscara de agua del equipo; el Simulador trabaja aparte, con datos simulados.',
      detalle: [
        ['El Simulador genera imágenes de radar con un modelo físico sencillo. Sirve para entender qué cambia en la señal; sus cifras no describen este embalse.'],
      ],
    },
    impactos: {
      titular: 'Cuánto cambió la orilla',
      frase: 'Entre las dos fechas cambia la superficie de agua medida; abajo se compara con el otro embalse.',
      cifra: 'Variación de la superficie de agua',
      vista: 'Máscara de agua antes y después: lo que deja de ser azul es orilla expuesta.',
      detalle: [
        ['La variación sale de las dos máscaras del equipo. Mide superficie, no volumen: lo que diga sobre el nivel del embalse es una hipótesis, por contrastar con la cota que publica el operador.'],
      ],
    },
  },
}

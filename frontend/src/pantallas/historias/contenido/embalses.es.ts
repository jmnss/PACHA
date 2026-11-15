import { t, type ContenidoHistoria } from './tipos'

/**
 * Embalses y lluvia (Mazar, con Daule-Peripa). Hoy los escenarios son sustitutos sintéticos: las cifras vienen de la
 * API con su sello y las frases sobre el cambio se redactan como ejemplo. Lo que la fase 2 aún no trae va en `porLlegar`.
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
      frase: 'En cada pasada se marca dónde hay agua; de esa marca sale la superficie del embalse.',
      cifra: 'Superficie de agua el {fecha}',
      vista: 'Máscara de agua de cada fecha: la parte azul es agua.',
      detalle: [
        ['La máscara separa cada píxel en «agua» y «no agua». La superficie es la suma de los píxeles de agua dentro del contorno del embalse, medida en la rejilla original.'],
        ['En este escenario de demostración la máscara es un sustituto sintético dibujado sobre el relieve real del lugar; no es una observación.'],
      ],
      porLlegar: ['Ficha del embalse con fuente: capacidad, potencia, usos y lluvia del lugar.'],
    },
    satelite: {
      titular: 'El agua en calma se ve oscura',
      frase: 'El agua lisa refleja la señal del radar lejos del satélite, así que casi no vuelve nada.',
      cifra: 'Superficie de agua el {fecha}',
      vista: 'Señal del radar en {pol}, antes y después: más oscuro = agua lisa.',
      detalle: [
        ['Un ', t('radar'), ' emite su propia señal y mide lo que vuelve, de día y de noche y a través de las nubes. Lo que vuelve de cada punto se mide en ', t('dB'), '.'],
        ['La onda de ', t('bandaL'), ' es larga. Sobre el agua en calma rebota como en un espejo y se aleja; sobre la orilla, la tierra y la vegetación esparcen la señal y una parte vuelve. Por eso el borde del agua se ve con nitidez en ', t('HH'), ' y en ', t('HV'), ', las dos orientaciones de la onda (la ', t('polarizacion'), ') de esta escena.'],
      ],
      porLlegar: [],
    },
    simular: {
      titular: 'Qué pasaría con más o menos lluvia',
      frase: 'Aquí podrás elegir la lluvia de unos meses y ver subir o bajar el agua sobre el relieve.',
      cifra: 'Nivel simulado del embalse',
      vista: 'La última máscara de agua: será el punto de partida de la simulación.',
      detalle: [
        ['La simulación del embalse usará la lluvia mensual del lugar y el relieve para estimar cuánta agua entra y sale. Será siempre un ejemplo de demostración, marcado como tal.'],
      ],
      porLlegar: ['Simulación del embalse: mes de inicio, lluvia y duración.'],
    },
    impactos: {
      titular: 'Cuánto cambió la orilla',
      frase: 'En este escenario de demostración, la superficie de agua cambia entre las dos fechas y deja orilla al descubierto.',
      cifra: 'Cambio de la superficie de agua entre las dos fechas',
      vista: 'Máscara de agua antes y después: lo que deja de ser azul es orilla expuesta.',
      detalle: [
        ['La variación se calcula en la API con las dos máscaras. Con datos reales sería una hipótesis por comprobar con el operador del embalse, nunca una conclusión.'],
      ],
      porLlegar: [
        'Energía y seguridad eléctrica (ilustrativas).',
        'Comparación Mazar – Daule-Peripa: lo que tienen en común y sus diferencias.',
      ],
    },
  },
}

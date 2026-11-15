import { t, type ContenidoHistoria } from './tipos'

/**
 * Incendio en el cerro Casitagua con las imágenes NISAR del equipo. La fecha del incendio y la superficie publicada
 * vienen de la ficha de la API, con su fuente; las lecturas son hipótesis.
 */
export const casitaguaEs: ContenidoHistoria = {
  clave: 'incendio',
  historiaApi: 'incendio',
  sitios: ['casitagua'],
  etiqueta: 'Incendio en la Sierra',
  titulo: 'Incendio en el cerro Casitagua',
  resumen: 'Qué pierde la ladera cuando arde y cómo lo nota un radar que atraviesa el humo.',
  polarizacion: 'HV',
  pasos: {
    datos: {
      titular: 'Dos pasadas, antes y después del fuego',
      frase: 'El radar pasó sobre el cerro antes y después del incendio; las dos imágenes se comparan punto a punto.',
      cifra: 'Inicio del incendio',
      vista: 'Señal del radar en {pol}, antes y después del fuego.',
      detalle: [
        ['Las dos imágenes cubren el mismo lugar, así que se pueden comparar punto a punto.'],
        ['Son de NISAR (producto GCOV, ', t('bandaL'), '), procesadas por el equipo PACHA. La fecha del incendio y la superficie publicada vienen de la prensa, con su enlace.'],
      ],
    },
    satelite: {
      titular: 'Lo que ardió pierde señal',
      frase: 'Cuando el fuego consume ramas y troncos, debería volver menos señal al satélite, sobre todo en HV.',
      cifra: 'Señal {pol} dentro del área marcada el {fecha} (mediana)',
      vista: 'Señal del radar en {pol}, antes y después: más oscuro = menos ramas y troncos.',
      detalle: [
        ['Un ', t('radar'), ' emite su propia señal, así que ve a través del humo. Lo que vuelve de cada punto se llama ', t('gamma0'), ' y se mide en ', t('dB'), '.'],
        ['La onda de ', t('bandaL'), ' atraviesa las hojas y llega a ramas y troncos. La ', t('polarizacion'), ' ', t('HV'), ' responde a esa madera: cuando se quema, se espera que la señal caiga. En ', t('HH'), ' el cambio se nota menos.'],
      ],
    },
    simular: {
      titular: 'Provoca tu propio incendio',
      frase: 'En el Simulador puedes encender un fuego de ejemplo y ver hasta dónde llega.',
      cifra: '',
      vista: 'Señal del radar en {pol}: compárala con lo que simules.',
      detalle: [
        ['El Simulador genera imágenes de radar con un modelo físico sencillo. Sirve para entender qué cambia en la señal; sus cifras no describen este incendio.'],
      ],
    },
    impactos: {
      titular: 'Cuánto marcó el equipo como quemado',
      frase: 'La máscara del equipo marca el área quemada; la capa ΔRFDI muestra dónde cambió la vegetación.',
      cifra: 'Área marcada como quemada el {fecha}',
      vista: 'Después del fuego: la máscara de quemado del equipo o el ΔRFDI.',
      detalle: [
        ['El ', t('rfdi'), ' compara la señal en ', t('HH'), ' y en ', t('HV'), '. El ΔRFDI es el RFDI de antes menos el de después: según el equipo, un valor positivo indica menos vegetación.'],
        ['Las cifras de abajo son hipótesis por comprobar: la API las contrasta con la superficie publicada.'],
      ],
    },
  },
}

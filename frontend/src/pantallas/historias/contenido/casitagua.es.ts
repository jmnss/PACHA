import { t, type ContenidoHistoria } from './tipos'

/**
 * Incendio en la Sierra (cerro Casitagua). El incendio es un evento real que se nombra sin fecha y con «evento real ·
 * fuente por añadir» hasta tener la fuente (regla 7); el escenario de hoy es de demostración.
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
      titular: 'Un radar que pasa una y otra vez',
      frase: 'El escenario reúne las pasadas del satélite sobre el cerro, antes y después del fuego.',
      cifra: 'Pasadas en el escenario',
      vista: 'Señal del radar en {pol}, antes y después del fuego.',
      detalle: [
        ['Cada pasada es una imagen del mismo lugar tomada desde la misma órbita, así que se pueden comparar punto a punto.'],
        ['En este escenario de demostración las pasadas son sintéticas, generadas sobre el relieve real del cerro.'],
      ],
      porLlegar: ['Ficha del sitio con fuente: superficie reportada del incendio.'],
    },
    satelite: {
      titular: 'Lo que ardió pierde señal',
      frase: 'Cuando el fuego consume ramas y troncos, vuelve menos señal al satélite.',
      cifra: 'Área quemada que detecta el radar',
      vista: 'Señal del radar en {pol}, antes y después: más oscuro = menos ramas y troncos.',
      detalle: [
        ['Un ', t('radar'), ' emite su propia señal, así que ve a través del humo. Lo que vuelve de cada punto se llama ', t('sigma0'), ' y se mide en ', t('dB'), '.'],
        ['La onda de ', t('bandaL'), ' atraviesa las hojas y llega a ramas y troncos. La ', t('polarizacion'), ' ', t('HV'), ' responde a esa madera: cuando se quema, la señal cae. En ', t('HH'), ' el cambio se nota menos.'],
      ],
      porLlegar: [],
    },
    simular: {
      titular: 'Provoca tu propio incendio',
      frase: 'En el Simulador puedes encender un fuego de ejemplo y ver hasta dónde llega.',
      cifra: 'Área quemada simulada (verdad sintética)',
      vista: 'Señal del radar en {pol}: compárala con lo que simules.',
      detalle: [
        ['La verdad sintética es el perímetro que dibujó el generador de demostración. Sirve para medir cuánto acierta el detector del paso anterior.'],
      ],
      porLlegar: ['Simulación colocada en el Casitagua, con los impactos recalculados.'],
    },
    impactos: {
      titular: 'Qué se perdió con el fuego',
      frase: 'En este escenario de demostración, la vegetación quemada se traduce en carbono enviado al aire.',
      cifra: 'CO₂ emitido (estimado)',
      vista: 'Señal del radar en {pol}: la zona oscura es la que perdió biomasa.',
      detalle: [
        ['La API estima la biomasa perdida con la superficie quemada y, de ella, el CO₂. Son cifras de ejemplo: con datos reales serían una hipótesis por comprobar.'],
      ],
      porLlegar: ['Calidad del aire y factores de emisión con su cita.'],
    },
  },
}

import { t, type ContenidoHistoria } from './tipos'

export const embalsesEn: ContenidoHistoria = {
  clave: 'embalses',
  historiaApi: 'embalse',
  sitios: ['mazar', 'daule-peripa'],
  etiqueta: 'Reservoirs and rain',
  titulo: 'Reservoirs and rain',
  resumen: 'How much water a reservoir holds and how a radar that sees through clouds sees it.',
  polarizacion: 'HH',
  pasos: {
    datos: {
      titular: 'How much water is in the reservoir',
      frase: 'On each pass, the water is marked; the reservoir’s surface comes from that mark.',
      cifra: 'Water surface on {fecha}',
      vista: 'Water mask for each date: the blue part is water.',
      detalle: [
        ['The mask sorts each pixel into “water” and “not water”. The surface is the sum of the water pixels inside the reservoir outline, measured on the original grid.'],
        ['In this demonstration scenario the mask is a synthetic stand-in drawn over the real terrain of the site; it is not an observation.'],
      ],
      porLlegar: ['Reservoir fact sheet with sources: capacity, power, uses and local rainfall.'],
    },
    satelite: {
      titular: 'Calm water looks dark',
      frase: 'Smooth water bounces the radar signal away from the satellite, so almost nothing comes back.',
      cifra: 'Water surface on {fecha}',
      vista: 'Radar signal in {pol}, before and after: darker = smooth water.',
      detalle: [
        ['A ', t('radar'), ' sends its own signal and measures what returns, day and night and through clouds. What returns from each point is measured in ', t('dB'), '.'],
        ['An ', t('bandaL'), ' wave is long. On calm water it bounces off like a mirror and travels away; on the shore, soil and plants scatter the signal and some of it returns. That is why the water’s edge is sharp in ', t('HH'), ' and in ', t('HV'), ', the two orientations of the wave (the ', t('polarizacion'), ') in this scene.'],
      ],
      porLlegar: [],
    },
    simular: {
      titular: 'What if it rained more or less',
      frase: 'Here you will pick the rain for a few months and watch the water rise or fall over the terrain.',
      cifra: 'Simulated reservoir level',
      vista: 'The latest water mask: the starting point of the simulation.',
      detalle: [
        ['The reservoir simulation will use the site’s monthly rainfall and the terrain to estimate how much water comes in and goes out. It will always be a demonstration example, labelled as such.'],
      ],
      porLlegar: ['Reservoir simulation: starting month, rainfall and duration.'],
    },
    impactos: {
      titular: 'How much the shoreline changed',
      frase: 'In this demonstration scenario, the water surface changes between the two dates and leaves shoreline exposed.',
      cifra: 'Change in water surface between the two dates',
      vista: 'Water mask before and after: what stops being blue is exposed shoreline.',
      detalle: [
        ['The change is computed by the API from the two masks. With real data it would be a hypothesis to check with the reservoir operator, never a conclusion.'],
      ],
      porLlegar: [
        'Energy and power-supply security (illustrative).',
        'Mazar – Daule-Peripa comparison: what they share and how they differ.',
      ],
    },
  },
}

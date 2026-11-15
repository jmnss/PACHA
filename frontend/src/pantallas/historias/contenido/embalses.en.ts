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
      frase: 'The team marked where there is water in each radar image; the reservoir’s surface comes from that mark.',
      cifra: 'Water surface on {fecha}',
      vista: 'The team’s water mask for each date: the blue part is water.',
      detalle: [
        ['The mask sorts each pixel into “water” and “not water”. The surface is the sum of the water pixels inside the reservoir outline, measured on the original grid.'],
        ['The images are from NISAR (GCOV product, ', t('bandaL'), '), processed and segmented by the PACHA team.'],
      ],
    },
    satelite: {
      titular: 'Calm water looks dark',
      frase: 'Smooth water reflects the radar signal away from the satellite, so almost nothing comes back.',
      cifra: 'Water signal in {pol} on {fecha} (median)',
      vista: 'Radar signal in {pol}, before and after: darker = smooth water.',
      detalle: [
        ['A ', t('radar'), ' sends out its own signal and measures what comes back, day and night and through clouds. What returns from each point is called ', t('gamma0'), ' and is measured in ', t('dB'), '.'],
        ['The ', t('bandaL'), ' wave is long. On calm water it bounces off like a mirror and goes away; on the shore, soil and vegetation scatter the signal and part of it returns. That is why the water’s edge shows in ', t('HH'), ' and in ', t('HV'), ', the two orientations of the wave (the ', t('polarizacion'), ') in these images.'],
      ],
    },
    simular: {
      titular: 'Try the radar in the Simulator',
      frase: 'In the Simulator you can create an example change and see how the radar would see it.',
      cifra: '',
      vista: 'The team’s water mask; the Simulator works separately, with simulated data.',
      detalle: [
        ['The Simulator generates radar images with a simple physical model. It helps to understand what changes in the signal; its figures do not describe this reservoir.'],
      ],
    },
    impactos: {
      titular: 'How much the shoreline changed',
      frase: 'The measured water surface changes between the two dates; below it is compared with the other reservoir.',
      cifra: 'Change in water surface',
      vista: 'Water mask before and after: what stops being blue is exposed shore.',
      detalle: [
        ['The change comes from the team’s two masks. It measures surface, not volume: anything it says about the reservoir level is a hypothesis, to be checked against the level published by the operator.'],
      ],
    },
  },
}

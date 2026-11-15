import { t, type ContenidoHistoria } from './tipos'

export const casitaguaEn: ContenidoHistoria = {
  clave: 'incendio',
  historiaApi: 'incendio',
  sitios: ['casitagua'],
  etiqueta: 'Fire in the Sierra',
  titulo: 'Fire on Casitagua hill',
  resumen: 'What the slope loses when it burns and how a radar that sees through smoke notices it.',
  polarizacion: 'HV',
  pasos: {
    datos: {
      titular: 'A radar that passes again and again',
      frase: 'The scenario gathers the satellite’s passes over the hill, before and after the fire.',
      cifra: 'Passes in the scenario',
      vista: 'Radar signal in {pol}, before and after the fire.',
      detalle: [
        ['Each pass is an image of the same place taken from the same orbit, so they can be compared point by point.'],
        ['In this demonstration scenario the passes are synthetic, generated over the real terrain of the hill.'],
      ],
      porLlegar: ['Site fact sheet with sources: reported burned area.'],
    },
    satelite: {
      titular: 'What burned loses signal',
      frase: 'When fire consumes branches and trunks, less signal returns to the satellite.',
      cifra: 'Burned area detected by the radar',
      vista: 'Radar signal in {pol}, before and after: darker = fewer branches and trunks.',
      detalle: [
        ['A ', t('radar'), ' sends its own signal, so it sees through smoke. What returns from each point is called ', t('sigma0'), ' and is measured in ', t('dB'), '.'],
        ['An ', t('bandaL'), ' wave passes through leaves and reaches branches and trunks. The ', t('HV'), ' ', t('polarizacion'), ' responds to that wood: when it burns, the signal drops. In ', t('HH'), ' the change is weaker.'],
      ],
      porLlegar: [],
    },
    simular: {
      titular: 'Start your own fire',
      frase: 'In the Simulator you can light an example fire and see how far it spreads.',
      cifra: 'Simulated burned area (synthetic truth)',
      vista: 'Radar signal in {pol}: compare it with what you simulate.',
      detalle: [
        ['The synthetic truth is the perimeter drawn by the demonstration generator. It measures how well the detector of the previous step does.'],
      ],
      porLlegar: ['Simulation placed on Casitagua, with impacts recomputed.'],
    },
    impactos: {
      titular: 'What the fire took',
      frase: 'In this demonstration scenario, burned vegetation turns into carbon released into the air.',
      cifra: 'CO₂ emitted (estimated)',
      vista: 'Radar signal in {pol}: the dark area is the one that lost biomass.',
      detalle: [
        ['The API estimates lost biomass from the burned area and, from it, the CO₂. These are example figures: with real data they would be a hypothesis to check.'],
      ],
      porLlegar: ['Air quality and emission factors with their citation.'],
    },
  },
}

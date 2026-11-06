import { t, type ContenidoHistoria } from './tipos'

/** Written as an illustrative example: no figures or event names, no years (docs/challenge.md, honesty). */
export const incendioEn: ContenidoHistoria = {
  clave: 'incendio',
  etiqueta: 'Fire in the Highlands',
  titulo: 'When the forest burns in the Highlands',
  resumen: 'A Highland slope with forest that burns in the dry season, seen by a radar that passes through smoke and clouds.',
  queCambia: {
    titulo: 'What changes and why it matters',
    parrafos: [
      ['In the Highlands, the dry season leaves the forest and grasslands dry, and a fire can consume leaves, branches and part of the trunks within a few days. Knowing what area burned and how much vegetation was lost helps plan restoration, protect watersheds and estimate the damage.'],
      ['During a fire, smoke and clouds block the view of optical satellites. This story shows what changes in a radar signal when the forest loses its structure.'],
    ],
  },
  queVeElRadar: {
    titulo: 'What the radar sees and why',
    parrafos: [
      ['NISAR is a ', t('radar'), ' satellite mission by NASA and the Indian space agency (ISRO); its technical details are pending confirmation with the official documentation. A radar of this kind is an active sensor: it sends out its own signal and measures what comes back. That is why it works day and night, and why the signal passes through smoke and clouds. What it measures at each point is called ', t('sigma0'), ' and is expressed in ', t('dB'), '.'],
      ['What comes back depends on the ', t('rugosidad'), ' and the ', t('dielectrica'), ' of the terrain. A forest is a collection of branches and trunks that scatter the signal in all directions; the more wood and foliage, the more signal returns, although only up to a point: with a lot of biomass the signal saturates and stops growing.'],
      ['An ', t('bandaL'), ' wave is long and passes through the leaves to reach the branches and trunks. When fire consumes them, that scattering disappears and the signal drops. The radar also sends and receives the wave with a given orientation, the ', t('polarizacion'), ', and each combination responds differently to branches, soil and moisture. Which bands and polarizations NISAR products will have is pending confirmation with the official documentation.'],
    ],
  },
  comparador: {
    titulo: 'Before and after, in the comparator',
    introduccion: [
      ['Slide the divider to go from the «before» pass to the «after» pass of the scenario. The area that gets darker is the one that lost structure. To measure a point or a quadrant, open the same scenario in the Observatory.'],
    ],
    polarizacion: 'HV',
    porQue: ['The ', t('HV'), ' ', t('polarizacion'), ' is the one that best highlights burned forest: it responds to the scattering from branches and trunks, and drops when that structure is consumed.'],
    otra: ['Switch to ', t('HH'), ' to compare: it also responds to the soil and moisture, and the change in the forest is harder to tell apart.'],
  },
  hipotesis: {
    titulo: 'What could explain what is seen',
    parrafos: [
      ['In this demonstration scenario, an example hypothesis is that the dry season leaves the fuel (leaf litter, grass and dry branches) ready to burn, and that a fire spreads faster uphill when the wind blows.'],
      ['In this demonstration scenario, another illustrative hypothesis is that the burned area coincides with the areas of highest biomass: where there are more branches and trunks there is more fuel and, therefore, a sharper drop in the HV signal.'],
      ['In this demonstration scenario, an example human driver is agricultural burning: a fire set to clear a field can escape into the neighbouring forest if the soil and grass are dry.'],
    ],
  },
  aplicaciones: {
    titulo: 'Future applications and what would be needed',
    parrafos: [
      ['With NISAR observations, this reading could be used to map burned areas even under smoke or cloud, and to estimate how much biomass was lost, supporting those who manage forests and restoration. What coverage and how many passes there will be over the Highlands is pending confirmation with the official documentation.'],
      ['Moving from the example to a conclusion would require: a series of passes before and after the fire over the same place; the polarizations available in each; and field validation, with measured burned plots and independent burn scar maps. Until then, this story only illustrates how it would look.'],
    ],
  },
}

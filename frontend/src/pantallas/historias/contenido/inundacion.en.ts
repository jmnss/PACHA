import { t, type ContenidoHistoria } from './tipos'

/** Written as an illustrative example: no figures or event names, no years (docs/challenge.md, honesty). */
export const inundacionEn: ContenidoHistoria = {
  clave: 'inundacion',
  etiqueta: 'Flood on the Coast',
  titulo: 'When the water rises on the lowland Coast',
  resumen: 'A Coastal plain that fills with water in the rainy season and dries out afterwards, seen by a radar that needs neither sunlight nor a clear sky.',
  queCambia: {
    titulo: 'What changes and why it matters',
    parrafos: [
      ['On the lowland Coast, the rainy season fills wetlands, river channels and neighbouring fields with water. When the dry season arrives, the water withdraws. Knowing how much land is covered, where, and for how long helps decide where to plant, where not to build, and whom to warn.'],
      ['Looking from space has one difficulty: just when it rains most, the sky is covered in clouds and ordinary cameras cannot see the ground. This story shows how a radar can, and which signals reveal the water.'],
    ],
  },
  queVeElRadar: {
    titulo: 'What the radar sees and why',
    parrafos: [
      ['NISAR is a ', t('radar'), ' satellite mission by NASA and the Indian space agency (ISRO); its technical details are pending confirmation with the official documentation. A radar of this kind is an active sensor: it sends out its own signal and measures what comes back. That is why it works day and night, and why the signal passes through clouds. What it measures at each point is called ', t('sigma0'), ' and is expressed in ', t('dB'), '.'],
      ['What comes back depends on two properties of the terrain: its ', t('rugosidad'), ' and its ', t('dielectrica'), '. Open, calm water is very smooth: it acts like a mirror and sends the signal away from the satellite, so it looks dark in the image.'],
      ['Under flooded trees or tall crops the opposite happens. The signal bounces off the water, then off a trunk (or the stalk of a tall crop) and returns towards the satellite (a double bounce), and the area looks brighter than before. An ', t('bandaL'), ' wave passes through part of the canopy, so it can record that bounce. The radar also sends and receives the wave with a given orientation, the ', t('polarizacion'), ', and each combination responds differently to water and to plants. Which bands and polarizations NISAR products will have is pending confirmation with the official documentation.'],
    ],
  },
  comparador: {
    titulo: 'Before and after, in the comparator',
    introduccion: [
      ['Slide the divider to go from the «before» pass to the «after» pass of the scenario. The areas that get darker or lighter are the ones that changed. To measure a point or a quadrant, open the same scenario in the Observatory.'],
    ],
    polarizacion: 'HH',
    porQue: ['The ', t('HH'), ' ', t('polarizacion'), ' is the one that best highlights water: open water appears dark because of the mirror-like reflection, and flooded vegetation appears bright because of the double bounce.'],
    otra: ['Switch to ', t('HV'), ' to compare: it responds mostly to foliage, and the contrast of the water is lower.'],
  },
  hipotesis: {
    titulo: 'What could explain what is seen',
    parrafos: [
      ['In this demonstration scenario, an example hypothesis is that the rains of the Coast rainy season fill the wetland and spill it onto the low-lying land; as the dry season advances, the water withdraws and the dark areas shrink.'],
      ['In this demonstration scenario, another illustrative hypothesis is that overflow from neighbouring river channels feeds the areas of flooded vegetation, the ones that look bright because of the double bounce, and that these dry out more slowly than open water.'],
      ['In this demonstration scenario, an example human driver is agricultural expansion: fields that replace the wetland change the roughness and moisture of the soil, and with them its radar signal, even if the same amount of rain falls.'],
    ],
  },
  aplicaciones: {
    titulo: 'Future applications and what would be needed',
    parrafos: [
      ['With NISAR observations, this same reading could be used to monitor wetlands and map floods even under cloud, and to support those who manage water, risk and agriculture. What coverage and how many passes there will be over the Coast of Ecuador is pending confirmation with the official documentation.'],
      ['Moving from the example to a conclusion would require: a long series of passes over the same place, covering several rainy and dry seasons; the polarizations available in each pass; and field validation with water-level measurements and observations of the vegetation. Until then, this story only illustrates how it would look.'],
    ],
  },
}

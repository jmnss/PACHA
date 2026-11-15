import type { TextoPaso } from './guion.es'

/** Tour script in English. Same ids and order as the Spanish script; routes and durations come from it. */
export const guionEn: TextoPaso[] = [
  {
    id: 'problema', titulo: 'A river rises and nobody can see how far',
    texto: 'When a flood arrives on Ecuador’s lower Coast, clouds often cover the sky just when it matters most to look.',
  },
  {
    id: 'nubes', titulo: 'Clouds do not stop it',
    texto: 'A radar emits its own signal, day and night. Raise the clouds: the optical image is lost and the radar keeps seeing the flood.',
  },
  {
    id: 'polarizacion', titulo: 'Each polarization tells something different',
    texto: 'Open water, water under trees and a burned forest respond differently depending on how the wave is transmitted and received.',
  },
  {
    id: 'mapa', titulo: 'From data to a change map',
    texto: 'In the Observatory, two passes become a map of what changed, with its time series and the measurement of a quadrant.',
  },
  {
    id: 'incendio', titulo: 'Another change, another signal',
    texto: 'A fire in the Highlands: cross-polarization (HV) drops where the forest loses structure. Slide to compare before and after.',
  },
  {
    id: 'simulador', titulo: 'And if it happens tomorrow',
    texto: 'The Event Simulator launches an earthquake, an eruption or a fire over Ecuador’s real terrain and shows what a radar would see.',
  },
]

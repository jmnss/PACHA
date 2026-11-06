import type { ContenidoFundamentos } from './contenido.tipos'

const pendiente = 'pending confirmation with the official documentation'

/** Fundamentals in English. General radar physics only; anything NISAR-specific is marked as pending. */
export const contenidoEn: ContenidoFundamentos = {
  pendiente,
  radar: [
    [
      'A synthetic aperture radar (',
      { nombre: 'SAR', explicacion: 'A radar that combines many measurements along its flight path to form high-resolution images.' },
      ') emits microwaves and measures the echo. That makes it an ',
      { nombre: 'active', explicacion: 'It emits its own signal: it does not depend on sunlight.' },
      ' sensor: it works day and night and sees through clouds.',
    ],
    [
      'The echo depends on the surface ',
      { nombre: 'roughness', explicacion: 'How irregular the surface is compared with the wavelength.' },
      ' and on its ',
      { nombre: 'dielectric constant', explicacion: 'How strongly a material responds to the electric field; water has a very high one, so moisture shows up in the echo.' },
      '. That is why radar highlights water, floods and moisture. With two passes it can also measure ground motion, at the centimeter scale.',
    ],
  ],
  fenomenos: [
    { cambio: 'Floods and wetlands', pol: 'HH and VV',
      que_ve: 'Calm water reflects the signal away from the radar and looks dark. If there is vegetation over the water, the double bounce makes it brighter.' },
    { cambio: 'Deforestation and fires', pol: 'HV',
      que_ve: 'Cross-polarization responds to forest structure (branches, leaves); when that is lost, the signal drops.' },
    { cambio: 'Crops and their health', pol: 'HV and VV',
      que_ve: 'Growth changes the crop’s structure and moisture, and with them the signal over the season.' },
    { cambio: 'Soil moisture', pol: 'HH and VV',
      que_ve: 'Water in the soil raises its dielectric constant and, with it, the echo: wetter soil usually looks brighter.' },
    { cambio: 'Glaciers and sea ice', pol: 'Several',
      que_ve: 'Roughness, moisture and motion tell ice from water and make it possible to follow the advance of the front.' },
    { cambio: 'Earthquakes and subsidence', pol: 'Phase of two passes',
      que_ve: 'Comparing the phase of two passes shows how far the ground moved, at the centimeter scale (interferometry).' },
  ],
  polBandas: [
    { nombre: 'Polarization', explicacion: 'Orientation of the wave when transmitted (first letter) and when received (second): H horizontal, V vertical.' },
    ' is named with two letters: HH, VV (co-polarized) and HV (cross-polarized). Each one responds to a different part of the structure. The ',
    { nombre: 'band', explicacion: 'Range of radar frequencies; the longer the wavelength, the more it penetrates vegetation.' },
    ' sets the wavelength.',
  ],
  bandas: [
    { nombre: 'X', longitud: '≈ 2.4–3.8 cm', nota: 'Fine detail; does not penetrate vegetation well.' },
    { nombre: 'C', longitud: '≈ 3.8–7.5 cm', nota: 'Interacts mostly with the top of the canopy.' },
    { nombre: 'S', longitud: '≈ 7.5–15 cm', nota: 'Intermediate between C and L.' },
    { nombre: 'L', longitud: '≈ 15–30 cm', nota: 'Penetrates the canopy more; sensitive to trunks and soil.' },
  ],
  mision: [
    `NISAR is the synthetic aperture radar mission of NASA and ISRO. Its launch date, orbit, frequencies, products and observation rhythm are ${pendiente}, and this app does not take them as given.`,
  ],
}

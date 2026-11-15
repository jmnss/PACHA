import type { Terminos } from './tipos'

export const terminosEn: Terminos = {
  radar: {
    nombre: 'synthetic aperture radar',
    explicacion: 'A radar carried on a satellite that, as it moves, builds detailed images of the ground. It sends out its own signal, so it does not need sunlight.',
  },
  sigma0: {
    nombre: 'σ⁰',
    explicacion: 'How much signal returns to the satellite from each point on the ground (backscatter). Smooth water returns little; tree canopies return a lot.',
  },
  gamma0: {
    nombre: 'γ⁰',
    explicacion: 'How much signal returns to the satellite from each point on the ground, corrected for the slope of the terrain. Smooth water returns little; tree canopies return a lot.',
  },
  rfdi: {
    nombre: 'RFDI',
    explicacion: 'Radar forest degradation index: it compares the signal in HH and HV to describe how much vegetation scatters the wave. Its change between two dates (ΔRFDI) points to where vegetation changed.',
  },
  dB: {
    nombre: 'dB',
    explicacion: 'Decibels: a scale that compresses very different numbers. Every 3 dB of difference is, roughly, double or half the signal.',
  },
  HH: { nombre: 'HH', explicacion: 'The wave is sent and received in the horizontal orientation.' },
  HV: { nombre: 'HV', explicacion: 'The wave is sent horizontally and received vertically.' },
  polarizacion: {
    nombre: 'polarization',
    explicacion: 'The orientation of the radar wave when it is sent and when it is received. Each combination responds differently to water, vegetation and soil.',
  },
  bandaL: {
    nombre: 'L-band',
    explicacion: 'A range of long-wavelength radar waves. Long waves pass through leaves and branches better than short ones.',
  },
  dielectrica: {
    nombre: 'dielectric constant',
    explicacion: 'How strongly a material responds to the radar wave. Water has a high one: that is why wet soil can be told apart from dry soil.',
  },
  rugosidad: {
    nombre: 'roughness',
    explicacion: 'How rough a surface is compared with the wavelength. A smooth surface acts like a mirror; a rough one scatters the signal in all directions.',
  },
}

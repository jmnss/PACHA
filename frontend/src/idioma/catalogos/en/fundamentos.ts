import type { fundamentos as esFundamentos } from '../es/fundamentos'

export const fundamentos: Record<keyof typeof esFundamentos, string> = {
  'fundamentos.titulo': 'Fundamentals',
  'fundamentos.hallazgo': 'The minimum you need to know to read a radar image.',
  'fundamentos.tarjeta.radar': 'A radar that lights its own scene',
  'fundamentos.tarjeta.cambios': 'What the radar sees in each type of change',
  'fundamentos.tarjeta.pol_bandas': 'Polarizations and bands',
  'fundamentos.tarjeta.mision': 'The NISAR mission',
  'fundamentos.col.cambio': 'Change',
  'fundamentos.col.pol': 'Polarization that usually highlights it',
  'fundamentos.col.que_ve': 'What the radar sees',
  'fundamentos.col.banda': 'Band',
  'fundamentos.col.longitud': 'Typical wavelength',
  'fundamentos.col.nota': 'What it implies',
  'fundamentos.tabla.cambios': 'Changes and their radar signature',
  'fundamentos.tabla.bandas': 'Radar bands and their typical wavelength',
  'fundamentos.nota.cambios': 'General description of the physics; in the app the examples are demonstration data.',
  'fundamentos.nota.bandas': 'Typical wavelengths by general convention, not specific to any mission.',
  'fundamentos.nota.mision': 'Until there is access to the official data, everything you see here is demonstration data.',
}

import type { perfilReal as esPerfilReal } from '../es/perfilReal'

export const perfilReal: Record<keyof typeof esPerfilReal, string> = {
  'inicio.perfil_real.cota': '{m} m',
  'inicio.perfil_real.exageracion': 'Vertical exaggeration ×{n}',
  'inicio.perfil_real.fuente': 'Heights: Copernicus DEM GLO-30',
  'inicio.perfil_real.corte': 'Real section in straight legs: from the sea off the Coast to Daule-Peripa, Casitagua, Mazar and the Amazon; {km} km in all. Highest point on the section: {max} m. Heights from Copernicus DEM GLO-30, one per kilometre.',
}

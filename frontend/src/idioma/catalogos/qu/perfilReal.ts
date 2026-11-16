import type { perfilReal as esPerfilReal } from '../es/perfilReal'

// Borrador en kichwa unificado, pendiente de revisión por hablantes (ver docs/guia-traduccion-kichwa.md).
export const perfilReal: Record<keyof typeof esPerfilReal, string> = {
  'inicio.perfil_real.cota': '{m} m',
  'inicio.perfil_real.exageracion': 'Hawaman jatunyachishka ×{n}',
  'inicio.perfil_real.fuente': 'Jatunkuna: Copernicus DEM GLO-30',
  'inicio.perfil_real.corte': 'Chiqan pitikunapi kuchushka: Costa mama kucha manta Daule-Peripa, Casitagua, Mazar, Amazonía kamakama; tukuy {km} km. Ashtawan jatun: {max} m. Copernicus DEM GLO-30 jatunkuna, shuk kilometropi shuklla.',
}

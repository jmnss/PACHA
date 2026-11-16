/**
 * Colores del mapa sobre basalto (docs/diseno.md §8, v2 «Tierra viva»). Único archivo fuera de diseno/tokens.css y diseno/rampas.ts que
 * puede contener hex: MapLibre pinta en WebGL y no lee variables CSS. Los valores salen del diseño:
 * si cambian allí, cambian aquí.
 */
export const COLORES_MAPA = {
  tierra: '#2E3336',
  agua: '#1C2022',
  provincia: '#3A4044',
  exterior: '#24282B',
  frontera: '#F1E9DD',
  /** Opacidades (0–1), no colores. */
  opacidadFrontera: 0.6,
  opacidadExterior: 0.8,
  /** Límites de provincias sobre los mapas base remotos (tenues, con opacidadLimites). */
  limites: '#F1E9DD',
  opacidadLimites: 0.3,
  /** Marcador de punto elegido. */
  marcador: '#D9A21B',
  marcadorBorde: '#1F1D1A',
} as const

/** Respaldo de la franja de origen de las exportaciones PNG si no se pueden leer las variables CSS
 * (--demo-bg, --demo-ink de diseno/tokens.css). Mismos valores que los tokens. */
export const COLORES_EXPORTACION = { demoBg: '#F3D9B8', demoInk: '#6E2E0B' } as const

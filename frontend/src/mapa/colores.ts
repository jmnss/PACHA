/**
 * Colores del mapa (docs/diseno.md §8). Único archivo fuera de diseno/tokens.css y diseno/rampas.ts que
 * puede contener hex: MapLibre pinta en WebGL y no lee variables CSS. Los valores salen del diseño:
 * si cambian allí, cambian aquí. El guard de scripts/revision_visual.sh autoriza este archivo.
 */
export const COLORES_MAPA = {
  tierra: '#1b1b1f',
  agua: '#101014',
  provincia: '#2e2e33',
  exterior: '#171719',
  frontera: '#ffffff',
  /** Opacidades (0–1), no colores. */
  opacidadFrontera: 0.6,
  opacidadExterior: 0.8,
  /** Calles y agua de OpenFreeMap: tenues, solo contexto. */
  calles: '#3a3a3e',
  aguaRemota: '#101014',
  /** Marcador de punto elegido. */
  marcador: '#e5b93c',
  marcadorBorde: '#000000',
} as const

import type { a11y as esA11y } from '../es/a11y'

export const a11y: Record<keyof typeof esA11y, string> = {
  'a11y.saltar': 'Skip to content',
  'a11y.lienzo.con_media': '{que}. Source: {origen}. Mean value of the area: {valor}.',
  'a11y.lienzo.sin_media': '{que}. Source: {origen}.',
  'a11y.mapa.nota': 'Interactive map of the chosen layer. The same figures are in the metrics panel and in the results table on this screen.',
}

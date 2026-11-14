import type { CodigoIdioma } from './idiomas'

export type Valores = Record<string, string | number>

/** Sustituye `{x}` por su valor; si falta, muestra «—» en su lugar. */
export function interpolar(
  plantilla: string,
  valores: Valores = {},
  num: (n: number) => string = String,
): string {
  return plantilla.replace(/\{(\w+)\}/g, (_, nombre: string) => {
    const v = valores[nombre]
    if (v === undefined || v === null) return '—'
    return typeof v === 'number' ? num(v) : v
  })
}

/** Regla de plural. La de kichwa está pendiente de confirmar con hablantes: por ahora solo «otros». */
export function formaPlural(idioma: CodigoIdioma, n: number): 'uno' | 'otros' {
  if (idioma === 'qu') return 'otros'
  return n === 1 ? 'uno' : 'otros'
}

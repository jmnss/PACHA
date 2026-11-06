export type CodigoIdioma = 'es' | 'en' | 'qu'

export const IDIOMAS: readonly { codigo: CodigoIdioma; nombre: string; lang: string; corto: string }[] = [
  { codigo: 'es', nombre: 'Español', lang: 'es', corto: 'ES' },
  { codigo: 'en', nombre: 'English', lang: 'en', corto: 'EN' },
  { codigo: 'qu', nombre: 'Kichwa', lang: 'qu-EC', corto: 'QU' },
]

export const IDIOMA_POR_DEFECTO: CodigoIdioma = 'es'

export function esCodigoIdioma(x: unknown): x is CodigoIdioma {
  return x === 'es' || x === 'en' || x === 'qu'
}

export function langDe(c: CodigoIdioma): string {
  return IDIOMAS.find((i) => i.codigo === c)?.lang ?? 'es'
}

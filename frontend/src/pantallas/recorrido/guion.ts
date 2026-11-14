import type { CodigoIdioma } from '../../idioma/idiomas'
import { guionEn } from './guion.en'
import { guionEs, type Paso, type TextoPaso } from './guion.es'
import { guionQu } from './guion.qu'

export type { Paso, TextoPaso }

const TEXTOS: Record<CodigoIdioma, TextoPaso[]> = { es: guionEs, en: guionEn, qu: guionQu }

const fusionar = (textos: TextoPaso[]): Paso[] => guionEs.map((base, i) => ({ ...base, titulo: textos[i].titulo, texto: textos[i].texto }))
const POR_IDIOMA: Record<CodigoIdioma, Paso[]> = { es: guionEs, en: fusionar(TEXTOS.en), qu: fusionar(TEXTOS.qu) }

/** El guion en un idioma. Ruta y duración son las del español (fuente de verdad); solo cambia el texto. */
export function guionDe(idioma: CodigoIdioma): Paso[] {
  return POR_IDIOMA[idioma]
}

/** Versión en español (fuente de verdad): las pruebas de siempre. */
export const GUION: Paso[] = guionDe('es')

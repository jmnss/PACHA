import type { CodigoIdioma } from '../../../idioma/idiomas'
import { casitaguaEn } from './casitagua.en'
import { casitaguaEs } from './casitagua.es'
import { casitaguaQu } from './casitagua.qu'
import { embalsesEn } from './embalses.en'
import { embalsesEs } from './embalses.es'
import { embalsesQu } from './embalses.qu'
import { terminosEn } from './terminos.en'
import { terminosEs } from './terminos.es'
import { terminosQu } from './terminos.qu'
import type { ContenidoHistoria, Terminos } from './tipos'

const POR_IDIOMA: Record<CodigoIdioma, ContenidoHistoria[]> = {
  es: [embalsesEs, casitaguaEs],
  en: [embalsesEn, casitaguaEn],
  qu: [embalsesQu, casitaguaQu],
}
const TERMINOS_POR_IDIOMA: Record<CodigoIdioma, Terminos> = { es: terminosEs, en: terminosEn, qu: terminosQu }

/** Las historias en un idioma; la de embalses va primero. Mismas claves y mismo orden en los tres. */
export function historiasDe(idioma: CodigoIdioma): ContenidoHistoria[] {
  return POR_IDIOMA[idioma]
}

/** Explicaciones de los términos técnicos en un idioma. */
export function terminosDe(idioma: CodigoIdioma): Terminos {
  return TERMINOS_POR_IDIOMA[idioma]
}

/** Versión en español (fuente de verdad): las claves, el orden y las pruebas. */
export const HISTORIAS: ContenidoHistoria[] = historiasDe('es')

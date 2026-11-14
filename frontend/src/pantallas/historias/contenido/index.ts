import type { CodigoIdioma } from '../../../idioma/idiomas'
import { incendioEn } from './incendio.en'
import { incendioEs } from './incendio.es'
import { incendioQu } from './incendio.qu'
import { inundacionEn } from './inundacion.en'
import { inundacionEs } from './inundacion.es'
import { inundacionQu } from './inundacion.qu'
import { terminosEn } from './terminos.en'
import { terminosEs } from './terminos.es'
import { terminosQu } from './terminos.qu'
import type { ContenidoHistoria, Terminos } from './tipos'

const POR_IDIOMA: Record<CodigoIdioma, ContenidoHistoria[]> = {
  es: [inundacionEs, incendioEs],
  en: [inundacionEn, incendioEn],
  qu: [inundacionQu, incendioQu],
}
const TERMINOS_POR_IDIOMA: Record<CodigoIdioma, Terminos> = { es: terminosEs, en: terminosEn, qu: terminosQu }

/** Las historias en un idioma; la principal va primero. Mismas claves y mismo orden en los tres. */
export function historiasDe(idioma: CodigoIdioma): ContenidoHistoria[] {
  return POR_IDIOMA[idioma]
}

/** Explicaciones de los términos técnicos en un idioma. */
export function terminosDe(idioma: CodigoIdioma): Terminos {
  return TERMINOS_POR_IDIOMA[idioma]
}

/** Versión en español (fuente de verdad): las claves, el orden y las pruebas de siempre. */
export const HISTORIAS: ContenidoHistoria[] = historiasDe('es')

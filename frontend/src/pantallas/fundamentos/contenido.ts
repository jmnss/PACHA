import type { CodigoIdioma } from '../../idioma/idiomas'
import { contenidoEn } from './contenido.en'
import { contenidoEs } from './contenido.es'
import { contenidoQu } from './contenido.qu'
import type { Banda, ContenidoFundamentos, Fenomeno } from './contenido.tipos'

export type { Banda, ContenidoFundamentos, Fenomeno }
export type { Parrafo, Segmento } from './contenido.tipos'

const POR_IDIOMA: Record<CodigoIdioma, ContenidoFundamentos> = { es: contenidoEs, en: contenidoEn, qu: contenidoQu }

/** El texto largo de «Fundamentos» en un idioma. */
export function contenidoDe(idioma: CodigoIdioma): ContenidoFundamentos {
  return POR_IDIOMA[idioma]
}

/** Versión en español (fuente de verdad): las claves, el orden y las pruebas de siempre. */
export const PENDIENTE = contenidoEs.pendiente
export const FENOMENOS: Fenomeno[] = contenidoEs.fenomenos
export const BANDAS: Banda[] = contenidoEs.bandas

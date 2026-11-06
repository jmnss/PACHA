import { es } from './catalogos/es'
import { en } from './catalogos/en'
import { qu } from './catalogos/qu'
import { formatoNumero } from './formato'
import type { CodigoIdioma } from './idiomas'
import { formaPlural, interpolar, type Valores } from './interpolar'

export type Catalogo = typeof es
export type Clave = keyof Catalogo
export type ClavePlural = {
  [K in Clave]: K extends `${infer B}.uno` ? (`${B}.otros` extends Clave ? B : never) : never
}[Clave]

export type T = (clave: Clave, valores?: Valores) => string
export type Tn = (base: ClavePlural, n: number, valores?: Valores) => string

const CATALOGOS: Record<CodigoIdioma, Catalogo> = { es, en, qu }

export function traductor(
  idioma: CodigoIdioma,
  catalogos: Partial<Record<CodigoIdioma, Catalogo>> = {},
): { t: T; tn: Tn } {
  const cat = catalogos[idioma] ?? CATALOGOS[idioma]
  const num = (n: number) => formatoNumero(idioma, n)
  const t: T = (clave, valores) => interpolar(cat[clave] ?? CATALOGOS.es[clave] ?? '—', valores, num)
  const tn: Tn = (base, n, valores) =>
    t(`${base}.${formaPlural(idioma, n)}` as Clave, { n, ...valores })
  return { t, tn }
}

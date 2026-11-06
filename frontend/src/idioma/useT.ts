import { createContext, useContext } from 'react'
import { es } from './catalogos/es'
import { formatoFecha, formatoNumero } from './formato'
import type { CodigoIdioma } from './idiomas'
import type { Valores } from './interpolar'
import { traductor, type T, type Tn } from './traductor'

export interface ResultadoTextoApi {
  texto: string
  traducido: boolean
}

export interface ContextoIdioma {
  idioma: CodigoIdioma
  cambiarIdioma: (c: CodigoIdioma) => void
  t: T
  tn: Tn
  formatoNumero: (n: number, op?: Intl.NumberFormatOptions) => string
  formatoFecha: (f: Date | string, estilo: 'larga' | 'mes-anio' | 'corta') => string
  textoApi: (texto: string, clave?: string | null, valores?: Valores | null) => ResultadoTextoApi
}

export function crearContexto(
  idioma: CodigoIdioma,
  cambiarIdioma: (c: CodigoIdioma) => void,
  catalogos?: Parameters<typeof traductor>[1],
): ContextoIdioma {
  const { t, tn } = traductor(idioma, catalogos)
  const cat = catalogos?.[idioma]
  return {
    idioma,
    cambiarIdioma,
    t,
    tn,
    formatoNumero: (n, op) => formatoNumero(idioma, n, op),
    formatoFecha: (f, estilo) => formatoFecha(idioma, f, estilo, t),
    textoApi: (texto, clave, valores) => {
      if (clave && (cat ? clave in cat : claveConocida(clave))) {
        return { texto: t(clave as Parameters<T>[0], valores ?? undefined), traducido: true }
      }
      return { texto, traducido: false }
    },
  }
}

function claveConocida(clave: string): boolean {
  return Object.prototype.hasOwnProperty.call(es, clave)
}

export const ContextoIdiomaReact = createContext<ContextoIdioma>(crearContexto('es', () => {}))

export function useT(): ContextoIdioma {
  return useContext(ContextoIdiomaReact)
}

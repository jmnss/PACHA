import { createContext, useContext } from 'react'
import { es } from './catalogos/es'
import { esClaveDerivada, valoresApi } from './clavesApi'
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
  textoApi: (texto: string, clave?: string | null, valores?: Valores | null, decimales?: Record<string, number> | null) => ResultadoTextoApi
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
    textoApi: (texto, clave, valores, decimales) => {
      const conocida = !!clave && (cat ? clave in cat : claveConocida(clave))
      // Una clave derivada del id o del texto (no emitida por la API) solo vale si el español coincide: así el
      // texto de otro proveedor con los mismos ids nunca se cambia por el nuestro.
      const valida = conocida && (!esClaveDerivada(clave!) || (es as Record<string, string>)[clave!] === texto)
      if (!valida) return { texto, traducido: false }
      // En español manda el texto de la API: el catálogo es solo para traducirlo.
      if (idioma === 'es') return { texto, traducido: true }
      const fecha = (f: string) => formatoFecha(idioma, f, 'larga', t)
      return { texto: t(clave as Parameters<T>[0], valoresApi(valores, (n, op) => formatoNumero(idioma, n, op), fecha, decimales)), traducido: true }
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

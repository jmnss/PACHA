/** Términos técnicos que las historias explican la primera vez que aparecen (docs/diseno.md §8). */
export type IdTermino =
  | 'radar' | 'sigma0' | 'gamma0' | 'dB' | 'HH' | 'HV' | 'polarizacion' | 'bandaL' | 'dielectrica' | 'rugosidad' | 'rfdi'

/** Un trozo de párrafo: texto llano o un término técnico. */
export type Segmento = string | { termino: IdTermino }
export type Parrafo = Segmento[]

export const t = (termino: IdTermino): Segmento => ({ termino })

export type Terminos = Record<IdTermino, { nombre: string; explicacion: string }>

export type PolarizacionHistoria = 'HH' | 'HV'

/** Los cuatro pasos de una historia, en orden (spec de embalses e incendios, §9). */
export const PASOS = ['datos', 'satelite', 'simular', 'impactos'] as const
export type ClavePaso = (typeof PASOS)[number]

/**
 * Un paso, con divulgación progresiva: se ve el titular, la frase llana y la cifra (que sale de la API); el
 * detalle técnico se abre al elegir el paso.
 */
export interface PasoHistoria {
  titular: string
  frase: string
  /** Rótulo de la cifra visible; `{fecha}` es la fecha de la pasada y `{pol}` la polarización activa. */
  cifra: string
  /** «Qué estás viendo» en el comparador durante este paso; `{pol}` es la polarización activa. */
  vista: string
  detalle: Parrafo[]
}

/** Una historia sobre los escenarios del equipo. */
export interface ContenidoHistoria {
  /** Valor del parámetro `historia` de la URL. */
  clave: 'embalses' | 'incendio'
  /** Valor del campo `historia` de /api/escenarios. */
  historiaApi: 'embalse' | 'incendio'
  /** Sitios (campo `sitio` de la API); el primero, por defecto. */
  sitios: readonly string[]
  etiqueta: string
  titulo: string
  resumen: string
  /** Polarización que mejor resalta el cambio en esta historia. */
  polarizacion: PolarizacionHistoria
  pasos: Record<ClavePaso, PasoHistoria>
}

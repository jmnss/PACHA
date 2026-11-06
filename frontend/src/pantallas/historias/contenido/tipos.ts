/** Términos técnicos que las historias explican la primera vez que aparecen (docs/diseno.md §8). */
export type IdTermino =
  | 'radar' | 'sigma0' | 'dB' | 'HH' | 'HV' | 'polarizacion' | 'bandaL' | 'dielectrica' | 'rugosidad'

/** Un trozo de párrafo: texto llano o un término técnico. */
export type Segmento = string | { termino: IdTermino }
export type Parrafo = Segmento[]

export const t = (termino: IdTermino): Segmento => ({ termino })

export type Terminos = Record<IdTermino, { nombre: string; explicacion: string }>

export type PolarizacionHistoria = 'HH' | 'HV'

/** Una historia: cinco partes fijas (docs/plan-migracion.md, Tarea 4.5). */
export interface ContenidoHistoria {
  /** Valor del campo `historia` de /api/escenarios. */
  clave: 'inundacion' | 'incendio'
  titulo: string
  /** Rótulo corto para el índice. */
  etiqueta: string
  resumen: string
  /** 1 · Qué cambia y por qué importa. */
  queCambia: { titulo: string; parrafos: Parrafo[] }
  /** 2 · Qué ve el radar y por qué. */
  queVeElRadar: { titulo: string; parrafos: Parrafo[] }
  /** 3 · El comparador antes/después. */
  comparador: {
    titulo: string
    introduccion: Parrafo[]
    polarizacion: PolarizacionHistoria
    /** Por qué esa polarización resalta el cambio. */
    porQue: Parrafo
    /** Qué se mira en el comparador al compararla con la otra polarización. */
    otra: Parrafo
  }
  /** 4 · Hipótesis: cada párrafo empieza por «En este escenario de demostración». */
  hipotesis: { titulo: string; parrafos: Parrafo[] }
  /** 5 · Aplicaciones futuras y qué haría falta. */
  aplicaciones: { titulo: string; parrafos: Parrafo[] }
}

export const PREFIJO_HIPOTESIS = 'En este escenario de demostración'

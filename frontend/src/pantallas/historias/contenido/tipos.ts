/** Términos técnicos que las historias explican la primera vez que aparecen (docs/diseno.md §8). */
export type IdTermino =
  | 'radar' | 'sigma0' | 'dB' | 'HH' | 'HV' | 'polarizacion' | 'bandaL' | 'dielectrica' | 'rugosidad'

/** Un trozo de párrafo: texto llano o un término técnico. */
export type Segmento = string | { termino: IdTermino }
export type Parrafo = Segmento[]

export const t = (termino: IdTermino): Segmento => ({ termino })

export const TERMINOS: Record<IdTermino, { nombre: string; explicacion: string }> = {
  radar: {
    nombre: 'radar de apertura sintética',
    explicacion: 'Un radar que va en un satélite y, moviéndose, dibuja imágenes detalladas del suelo. Emite su propia señal, así que no necesita luz del sol.',
  },
  sigma0: {
    nombre: 'σ⁰',
    explicacion: 'Cuánta señal vuelve al satélite desde cada punto del suelo. El agua lisa devuelve poca; las copas de los árboles, mucha.',
  },
  dB: {
    nombre: 'dB',
    explicacion: 'Decibelios: una escala que comprime números muy distintos. Cada 3 dB de diferencia es, más o menos, el doble o la mitad de señal.',
  },
  HH: { nombre: 'HH', explicacion: 'Se emite y se recibe con la onda en horizontal.' },
  HV: { nombre: 'HV', explicacion: 'Se emite en horizontal y se recibe en vertical.' },
  polarizacion: {
    nombre: 'polarización',
    explicacion: 'Orientación de la onda de radar al emitirse y al recibirse. Cada combinación responde distinto al agua, la vegetación y el suelo.',
  },
  bandaL: {
    nombre: 'banda L',
    explicacion: 'Un rango de ondas de radar de longitud larga. Las ondas largas atraviesan mejor las hojas y las ramas que las cortas.',
  },
  dielectrica: {
    nombre: 'constante dieléctrica',
    explicacion: 'Cuánto responde un material a la onda de radar. El agua la tiene alta: por eso un suelo mojado se distingue de uno seco.',
  },
  rugosidad: {
    nombre: 'rugosidad',
    explicacion: 'Qué tan áspera es una superficie comparada con la longitud de la onda. Una superficie lisa actúa como un espejo; una áspera esparce la señal en todas direcciones.',
  },
}

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

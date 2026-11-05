import type { Herramienta } from '../../api/simulador'
import type { ValorParametro } from './estadoSimulador'

export type Valores = Record<string, ValorParametro>

/** Defectos del catálogo con los valores ya elegidos por encima. */
export function valoresIniciales(h: Herramienta, elegidos: Valores): Valores {
  const v: Valores = {}
  for (const c of h.controles) v[c.id] = elegidos[c.id] ?? (c.defecto as ValorParametro)
  return v
}

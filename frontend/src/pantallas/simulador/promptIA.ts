import type { EventoDto } from '../../api/simulador'
import type { T } from '../../idioma/traductor'

type Accion = EventoDto['acciones']['acciones'][number]

/** Textos ya resueltos en el idioma activo: el armado del prompt no traduce ni calcula nada. */
export interface EscenarioResumido {
  fenomeno: string
  lugar: string
  lat: string
  lon: string
  parametros: string[]   // «Viento: 6 m/s»
  metricas: string[]     // «Área quemada: 1,2 km²»
  gravedad: string
  acciones: { momento: string; texto: string; fuente: string; url: string }[]
}

/** Prompt para pegar en el asistente de IA que prefiera el usuario: resumen del escenario simulado y pedido. */
export function armarPrompt(e: EscenarioResumido, t: T): string {
  const lista = (xs: string[]) => xs.map((x) => `- ${x}`).join('\n')
  return [
    t('sim.acc.prompt.intro'),
    '',
    t('sim.acc.prompt.fenomeno', { fenomeno: e.fenomeno }),
    t('sim.acc.prompt.lugar', { lugar: e.lugar, lat: e.lat, lon: e.lon }),
    '',
    t('sim.acc.prompt.parametros'),
    lista(e.parametros),
    '',
    t('sim.acc.prompt.metricas'),
    lista(e.metricas),
    t('sim.acc.prompt.gravedad', { nivel: e.gravedad }),
    '',
    t('sim.acc.prompt.acciones'),
    lista(e.acciones.map((a) => `[${a.momento}] ${a.texto} (${a.fuente}: ${a.url})`)),
    '',
    t('sim.acc.prompt.pedido'),
  ].join('\n')
}

export const MOMENTOS = ['antes', 'durante', 'despues'] as const
export type Momento = (typeof MOMENTOS)[number]

export const porMomento = (acciones: Accion[], m: Momento) => acciones.filter((a) => a.momento === m)

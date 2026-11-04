import type { UseQueryResult } from '@tanstack/react-query'
import { ErrorApi, MENSAJE_RED } from '../../api/cliente'
import type { Contexto } from '../../api/consultas'
import { Cargando, ErrorBloque, Vacio } from '../../diseno/Estados'
import { Tarjeta } from '../../diseno/Tarjeta'
import { Termino } from '../../diseno/Termino'
import { Barras } from '../../graficos/Barras'
import { formatoNumero } from '../../graficos/formato'
import { formatearFecha } from '../../tiempo/fechas'
import { temporadaDelMes } from './derivados'

interface Props {
  consulta: UseQueryResult<Contexto | null>
  /** Instante activo (ms): la temporada se lee del mes de la pasada que se está viendo. */
  ms: number
}

const hora = (ms: number) => (ms > 0 ? new Date(ms).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }) : undefined)

/** Contexto climático REAL del lugar (NASA POWER): no son datos de NISAR, y el sello lo dice. */
export function PanelContexto({ consulta, ms }: Props) {
  const titulo = 'Contexto del lugar'
  if (consulta.isPending) return <Tarjeta titulo={titulo}><Cargando texto="Cargando el contexto…" filas={4} /></Tarjeta>
  if (consulta.isError) {
    const e = consulta.error
    return (
      <Tarjeta titulo={titulo}>
        <ErrorBloque mensaje={e instanceof ErrorApi ? e.mensaje : MENSAJE_RED} ultimoDato={hora(consulta.dataUpdatedAt)} onReintentar={() => void consulta.refetch()} />
      </Tarjeta>
    )
  }
  const c = consulta.data
  if (!c) return <Tarjeta titulo={titulo}><Vacio titulo="Sin contexto" texto="No hay datos climáticos para este punto." /></Tarjeta>

  const temporada = temporadaDelMes(c, ms) ?? c.temporada.temporada
  const filas: [string, string][] = [
    ['Región', c.region],
    ['Provincia', c.provincia],
    ['Temporada en la pasada activa', `${temporada}${c.temporada.nombre_local ? ` · ${c.temporada.nombre_local}` : ''}`],
    ['Estación astronómica hoy', c.estacion_astronomica.estacion],
    ['Próximo hito', `${c.estacion_astronomica.proximo_hito}, ${formatearFecha(c.estacion_astronomica.fecha_proximo_hito) ?? ''}`],
    ['Humedad del suelo hoy', `${formatoNumero(c.humedad_suelo * 100, 1)} %`],
  ]
  return (
    <Tarjeta titulo={titulo}>
      <p className="panel-contexto__nota">
        Clima real de <Termino nombre="NASA POWER" explicacion="Servicio de la NASA con clima estimado a partir de satélites y modelos. Sirve para saber en qué temporada está un lugar; no son observaciones del radar NISAR." />,
        {' '}no de NISAR.
      </p>
      <dl className="lista-datos">
        {filas.map(([k, v]) => (
          <div key={k} className="lista-datos__fila">
            <dt>{k}</dt>
            <dd className="num">{v}</dd>
          </div>
        ))}
      </dl>
      <Barras
        titulo="Precipitación mensual"
        unidad="mm por mes"
        origen={c.origen}
        alto={160}
        valores={false}
        datos={c.clima_mensual.map((m) => ({ etiqueta: m.mes, corta: m.mes.charAt(0).toUpperCase(), valor: m.precipitacion_mm }))}
      />
    </Tarjeta>
  )
}

import type { ReactNode } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import { mensajeDeError } from '../../api/cliente'
import type { Contexto } from '../../api/consultas'
import { Cargando, ErrorBloque, Vacio } from '../../diseno/Estados'
import { Tarjeta } from '../../diseno/Tarjeta'
import { Termino } from '../../diseno/Termino'
import { Barras } from '../../graficos/Barras'
import { clavesApi } from '../../idioma/clavesApi'
import { TextoApi } from '../../idioma/TextoApi'
import { formatoHora } from '../../idioma/formato'
import { useT } from '../../idioma/useT'
import { temporadaDelMes } from './derivados'

interface Props {
  consulta: UseQueryResult<Contexto | null>
  /** Instante activo (ms): la temporada se lee del mes de la pasada que se está viendo. */
  ms: number
}


/** Contexto climático REAL del lugar (NASA POWER): no son datos de NISAR, y el sello lo dice. */
export function PanelContexto({ consulta, ms }: Props) {
  const { t, idioma, formatoNumero, formatoFecha } = useT()
  const titulo = t('obs.contexto.titulo')
  if (consulta.isPending) return <Tarjeta titulo={titulo}><Cargando texto={t('obs.contexto.cargando')} filas={4} /></Tarjeta>
  if (consulta.isError) {
    return (
      <Tarjeta titulo={titulo}>
        <ErrorBloque mensaje={mensajeDeError(consulta.error, t)} ultimoDato={formatoHora(idioma, consulta.dataUpdatedAt)} onReintentar={() => void consulta.refetch()} />
      </Tarjeta>
    )
  }
  const c = consulta.data
  if (!c) return <Tarjeta titulo={titulo}><Vacio titulo={t('obs.contexto.sin_contexto')} texto={t('obs.contexto.sin_datos')} /></Tarjeta>

  // «Lluviosa» y «Seca» son las dos temporadas que da la API; cualquier otra se muestra tal cual, marcada como español.
  const nombreTemporada = (s: string): ReactNode =>
    /^lluv/i.test(s) ? t('obs.contexto.temporada_lluviosa') : /^seca/i.test(s) ? t('obs.contexto.temporada_seca') : <TextoApi texto={s} clave={clavesApi.contexto('temporada', s)} />
  const temporada = temporadaDelMes(c, ms) ?? c.temporada.temporada
  const filas: [string, ReactNode][] = [
    [t('obs.contexto.region'), <TextoApi texto={c.region} clave={clavesApi.contexto('region', c.region)} />],
    [t('obs.contexto.provincia'), c.provincia],
    [
      t('obs.contexto.temporada'),
      <>{nombreTemporada(temporada)}{c.temporada.nombre_local ? <> · <TextoApi texto={c.temporada.nombre_local} clave={clavesApi.contexto('nombre_local', c.temporada.nombre_local)} /></> : null}</>,
    ],
    [t('obs.contexto.estacion'), <TextoApi texto={c.estacion_astronomica.estacion} clave={clavesApi.contexto('estacion', c.estacion_astronomica.estacion)} />],
    [
      t('obs.contexto.proximo_hito'),
      <><TextoApi texto={c.estacion_astronomica.proximo_hito} clave={clavesApi.contexto('proximo_hito', c.estacion_astronomica.proximo_hito)} />, {formatoFecha(c.estacion_astronomica.fecha_proximo_hito, 'larga')}</>,
    ],
    [t('obs.contexto.humedad'), `${formatoNumero(c.humedad_suelo * 100, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`],
  ]
  // Mes abreviado del idioma activo; en kichwa, el nombre del catálogo (`fecha.mes.N`).
  const mesCorto = (num: number, apiMes: string): string => {
    if (idioma === 'es') return apiMes
    if (idioma === 'en') return new Intl.DateTimeFormat('en', { month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, num - 1, 1)))
    return t(`fecha.mes.${num}` as Parameters<typeof t>[0])
  }
  return (
    <Tarjeta titulo={titulo}>
      <p className="panel-contexto__nota">
        {t('obs.contexto.nota_antes')}<Termino nombre="NASA POWER" explicacion={t('obs.contexto.power_explicacion')} />{t('obs.contexto.nota_despues')}
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
        titulo={t('obs.contexto.precipitacion')}
        unidad={t('obs.contexto.mm_mes')}
        origen={c.origen}
        alto={160}
        valores={false}
        datos={c.clima_mensual.map((m) => {
          const mes = mesCorto(m.mes_num, m.mes)
          return { etiqueta: mes, corta: mes.charAt(0).toUpperCase(), valor: m.precipitacion_mm }
        })}
      />
    </Tarjeta>
  )
}

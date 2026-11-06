import type { UseQueryResult } from '@tanstack/react-query'
import { mensajeDeError } from '../../api/cliente'
import type { Escenario, ResultadoCambio } from '../../api/consultas'
import type { components } from '../../api/tipos'
import { Cargando, ErrorBloque, Vacio } from '../../diseno/Estados'
import { FranjaKpi } from '../../diseno/FranjaKpi'
import { SelloOrigen } from '../../diseno/SelloOrigen'
import { Tabla } from '../../diseno/Tabla'
import { Tarjeta } from '../../diseno/Tarjeta'
import { TextoApi } from '../../idioma/TextoApi'
import { AyudaMetrica, EtiquetaMetrica, UnidadMetrica, ValorMetrica } from '../../idioma/MetricaApi'
import { clavesApi } from '../../idioma/clavesApi'
import { formatoHora } from '../../idioma/formato'
import { useT } from '../../idioma/useT'
import { formatearFecha } from '../../tiempo/fechas'

interface Props {
  esc: Escenario
  resultado: UseQueryResult<ResultadoCambio>
  indice: number
  antesId: string
  despuesId: string
}

type Metrica = components['schemas']['Metrica']


/** Pasada activa y métricas del cambio entre «antes» y «después» (valores tal como los calcula la API). */
export function PanelMetricas({ esc, resultado, indice, antesId, despuesId }: Props) {
  const { t, idioma } = useT()
  const fecha = (iso: string | undefined) => (iso ? formatearFecha(iso, idioma) ?? '—' : '—')
  const pasada = esc.adquisiciones[indice]
  const a = esc.adquisiciones.find((p) => p.id === antesId)
  const d = esc.adquisiciones.find((p) => p.id === despuesId)
  const r = resultado.data
  const sinPareja = resultado.fetchStatus === 'idle' && !r

  return (
    <>
      <FranjaKpi items={[
        { etiqueta: t('obs.metricas.pasada_activa'), valor: fecha(pasada?.instante), base: t('obs.metricas.pasada_base', { n: indice + 1, total: esc.adquisiciones.length }) },
        { etiqueta: t('obs.metricas.direccion'), valor: pasada?.direccion_orbital ? <TextoApi texto={pasada.direccion_orbital} clave={clavesApi.orbita(pasada.direccion_orbital)} /> : '—' },
      ]} />
      <Tarjeta
        titulo={t('obs.metricas.cambio_titulo')}
        pie={r ? <SelloOrigen origen={r.origen} /> : undefined}
      >
        <p className="panel-metricas__base">{t('obs.metricas.antes_despues', { antes: fecha(a?.instante), despues: fecha(d?.instante) })}</p>
        {sinPareja && <Vacio titulo={t('obs.metricas.sin_cambio_titulo')} texto={t('obs.estructura.sin_pareja')} />}
        {resultado.isPending && !sinPareja && <Cargando texto={t('obs.metricas.calculando')} filas={4} />}
        {resultado.isError && !r && (
          <ErrorBloque mensaje={mensajeDeError(resultado.error, t)}
            ultimoDato={formatoHora(idioma, resultado.dataUpdatedAt)} onReintentar={() => void resultado.refetch()} />
        )}
        {r && (
          <Tabla<Metrica>
            titulo={t('obs.metricas.tabla_titulo')}
            porPagina={50}
            columnas={[
              { clave: 'etiqueta', etiqueta: t('obs.metricas.col_metrica'), identidad: true, formato: (_v, f) => (
                <span className="metrica__nombre"><EtiquetaMetrica m={f} />{f.ayuda ? <span className="metrica__ayuda"><AyudaMetrica m={f} /></span> : null}</span>
              ) },
              { clave: 'valor', etiqueta: t('obs.metricas.col_valor'), numerica: true, formato: (_v, f) => (
                <><ValorMetrica m={f} />{f.unidad ? <span className="metrica__unidad"> <UnidadMetrica unidad={f.unidad} /></span> : null}</>
              ) },
            ]}
            filas={r.metricas}
          />
        )}
      </Tarjeta>
    </>
  )
}

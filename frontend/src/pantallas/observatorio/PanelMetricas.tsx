import type { UseQueryResult } from '@tanstack/react-query'
import { ErrorApi, MENSAJE_RED } from '../../api/cliente'
import type { Escenario, ResultadoCambio } from '../../api/consultas'
import { Cargando, ErrorBloque } from '../../diseno/Estados'
import { FranjaKpi } from '../../diseno/FranjaKpi'
import { SelloOrigen } from '../../diseno/SelloOrigen'
import { Tabla } from '../../diseno/Tabla'
import { Tarjeta } from '../../diseno/Tarjeta'
import { formatearFecha } from '../../tiempo/fechas'

interface Props {
  esc: Escenario
  resultado: UseQueryResult<ResultadoCambio>
  indice: number
  antesId: string
  despuesId: string
}

const hora = (ms: number) => (ms > 0 ? new Date(ms).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }) : undefined)
const fecha = (iso: string | undefined) => (iso ? formatearFecha(iso) ?? '—' : '—')

/** Pasada activa y métricas del cambio entre «antes» y «después» (valores tal como los calcula la API). */
export function PanelMetricas({ esc, resultado, indice, antesId, despuesId }: Props) {
  const pasada = esc.adquisiciones[indice]
  const a = esc.adquisiciones.find((p) => p.id === antesId)
  const d = esc.adquisiciones.find((p) => p.id === despuesId)
  const r = resultado.data

  return (
    <>
      <FranjaKpi items={[
        { etiqueta: 'Pasada activa', valor: fecha(pasada?.instante), base: `${indice + 1} de ${esc.adquisiciones.length}` },
        { etiqueta: 'Dirección orbital', valor: pasada?.direccion_orbital ?? '—' },
      ]} />
      <Tarjeta
        titulo="Cambio entre dos pasadas"
        pie={r ? <SelloOrigen origen={r.origen} /> : undefined}
      >
        <p className="panel-metricas__base">Antes · {fecha(a?.instante)} &nbsp;|&nbsp; Después · {fecha(d?.instante)}</p>
        {resultado.isPending && <Cargando texto="Calculando el cambio…" filas={4} />}
        {resultado.isError && !r && (
          <ErrorBloque mensaje={resultado.error instanceof ErrorApi ? resultado.error.mensaje : MENSAJE_RED}
            ultimoDato={hora(resultado.dataUpdatedAt)} onReintentar={() => void resultado.refetch()} />
        )}
        {r && (
          <Tabla
            titulo="Métricas del cambio"
            porPagina={50}
            columnas={[
              { clave: 'etiqueta', etiqueta: 'Métrica', identidad: true, formato: (_v, f) => (
                <span className="metrica__nombre">{String(f.etiqueta)}{f.ayuda ? <span className="metrica__ayuda">{String(f.ayuda)}</span> : null}</span>
              ) },
              { clave: 'valor', etiqueta: 'Valor', numerica: true, formato: (v, f) => (
                <>{String(v)}{f.unidad ? <span className="metrica__unidad"> {String(f.unidad)}</span> : null}</>
              ) },
            ]}
            filas={r.metricas.map((m) => ({ ...m }))}
          />
        )}
      </Tarjeta>
    </>
  )
}

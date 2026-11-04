import { Link, useSearchParams } from 'react-router-dom'
import { ErrorApi, MENSAJE_RED } from '../../api/cliente'
import { useMedicion, type Escenario, type Medicion } from '../../api/consultas'
import type { Cuadrante, Punto } from '../../comparador/Comparador'
import { Boton } from '../../diseno/Boton'
import { Cargando, ErrorBloque, Vacio } from '../../diseno/Estados'
import { FranjaKpi } from '../../diseno/FranjaKpi'
import { SelloOrigen } from '../../diseno/SelloOrigen'
import { Tabla } from '../../diseno/Tabla'
import { Tarjeta } from '../../diseno/Tarjeta'
import { descargarCsv } from '../../exportar/csv'
import { formatoNumero } from '../../graficos/formato'
import { coordenadasAprox, csvDeMedicion, nombreCsv, NOTA_POLARIZACION, polarizacionMedida } from './medicion'

interface Props {
  esc: Escenario
  antesId: string
  despuesId: string
  /** bbox [oeste, sur, este, norte] de la imagen medida. */
  bbox: readonly number[]
  punto: Punto | null
  cuadrante: Cuadrante | null
  /** Polarización elegida en el selector. */
  polarizacion?: string
  onBorrar: () => void
}

type Fila = Record<string, string | number | null>
const COLUMNAS_ORDEN = ['Capa', 'Medida', 'Valor', '% del cuadrante']

function columnasDe(filas: Fila[]) {
  const claves = COLUMNAS_ORDEN.filter((c) => filas.some((f) => c in f))
  return claves.map((c, i) => ({
    clave: c, etiqueta: c, identidad: i === 0, numerica: c === 'Valor' || c.startsWith('%'),
    formato: c.startsWith('%') ? (v: unknown) => (typeof v === 'number' ? `${formatoNumero(v, 1)} %` : '') : undefined,
  }))
}

const hora = (ms: number) => (ms > 0 ? new Date(ms).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }) : undefined)

/** Medición sobre la imagen: un punto (valores en las dos pasadas) o un cuadrante (resumen, tabla y CSV). */
export function Mediciones({ esc, antesId, despuesId, bbox, punto, cuadrante, polarizacion, onBorrar }: Props) {
  const [params] = useSearchParams()
  const hay = !!(punto || cuadrante)
  // Un solo gesto a la vez: el cuadrante manda si hubiera los dos.
  const peticion = hay && antesId !== despuesId
    ? { antes: antesId, despues: despuesId, ...(cuadrante ? { cuadrante } : { punto: punto! }) }
    : undefined
  const consulta = useMedicion(esc.id, peticion)
  const m: Medicion | undefined = consulta.data

  if (!hay) {
    return (
      <Tarjeta titulo="Medición">
        <Vacio titulo="Nada seleccionado" texto="Pulsa un punto de la imagen para ver sus valores, o arrastra para medir un cuadrante." />
      </Tarjeta>
    )
  }

  const borrar = <Boton variante="terciario" onClick={onBorrar}>Borrar selección</Boton>
  const filas = (m?.tabla ?? []) as Fila[]
  const enCuadrante = !!cuadrante
  const medida = m ? polarizacionMedida(m) : null
  const aSerie = new URLSearchParams(params)
  aSerie.set('vista', 'serie')
  const coordenadas = !enCuadrante && punto ? coordenadasAprox(bbox, punto) : null

  return (
    <Tarjeta titulo={enCuadrante ? 'Medición en un cuadrante' : 'Medición en un punto'} pie={m ? <SelloOrigen origen={m.origen} /> : undefined}>
      {coordenadas && (
        <p className="medicion__coordenadas num">
          <span className="medicion__etiqueta">Coordenadas aproximadas</span> {coordenadas.texto}
        </p>
      )}
      {consulta.isPending && consulta.fetchStatus !== 'idle' && <Cargando texto="Midiendo…" filas={3} />}
      {consulta.isError && (
        <ErrorBloque mensaje={consulta.error instanceof ErrorApi ? consulta.error.mensaje : MENSAJE_RED}
          ultimoDato={hora(consulta.dataUpdatedAt)} onReintentar={() => void consulta.refetch()} />
      )}
      {m && enCuadrante && (
        <FranjaKpi items={m.metricas.map((x, i) => ({ etiqueta: x.etiqueta, valor: x.valor, unidad: x.unidad || undefined, principal: i === 0 }))} />
      )}
      {m && !enCuadrante && m.metricas.length > 0 && (
        <p className="medicion__nota">{[m.metricas[0].ayuda, 'Valor medido en el píxel más cercano al punto'].filter(Boolean).join('. ')}.</p>
      )}
      {m && !enCuadrante && (
        <p className="medicion__nota">
          Serie temporal del punto: pendiente (la API aún no la ofrece).{' '}
          La serie del escenario está en la <Link to={{ search: aSerie.toString() }}>vista Serie</Link>.
        </p>
      )}
      {m && polarizacion && medida && medida !== polarizacion && <p className="medicion__nota">{NOTA_POLARIZACION}</p>}
      {m && filas.length > 0 && (
        <Tabla titulo={enCuadrante ? 'Medidas del cuadrante' : 'Valores en el punto'} columnas={columnasDe(filas)} filas={filas} porPagina={50} />
      )}
      <div className="medicion__acciones">
        {m && enCuadrante && (
          <Boton variante="secundario" onClick={() => descargarCsv(nombreCsv(esc.id, antesId, despuesId), csvDeMedicion(m))}>Descargar CSV</Boton>
        )}
        {borrar}
      </div>
    </Tarjeta>
  )
}

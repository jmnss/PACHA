import { Link, useSearchParams } from 'react-router-dom'
import { mensajeDeError } from '../../api/cliente'
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
import { langDe } from '../../idioma/idiomas'
import { TextoApi } from '../../idioma/TextoApi'
import { AyudaMetrica, EtiquetaMetrica, ValorMetrica } from '../../idioma/MetricaApi'
import type { T } from '../../idioma/traductor'
import type { CodigoIdioma } from '../../idioma/idiomas'
import { useT } from '../../idioma/useT'
import { coordenadasAprox, csvDeMedicion, nombreCsv, polarizacionMedida } from './medicion'

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
// Las claves de las filas llegan en español de la API; el rótulo de cada columna sale del catálogo.
const COLUMNAS_ORDEN = ['Capa', 'Medida', 'Valor', '% del cuadrante']

function columnasDe(filas: Fila[], t: T, idioma: CodigoIdioma) {
  const rotulo: Record<string, string> = {
    Capa: t('obs.medicion.col_capa'), Medida: t('obs.medicion.col_medida'), Valor: t('obs.metricas.col_valor'), '% del cuadrante': t('obs.medicion.col_pct'),
  }
  const claves = COLUMNAS_ORDEN.filter((c) => filas.some((f) => c in f))
  return claves.map((c, i) => ({
    clave: c, etiqueta: rotulo[c], identidad: i === 0, numerica: c === 'Valor' || c.startsWith('%'),
    formato: c.startsWith('%')
      ? (v: unknown) => (typeof v === 'number' ? `${formatoNumero(v, 1, idioma)} %` : '')
      : (v: unknown) => (typeof v === 'string' ? <TextoApi texto={v} /> : null),
  }))
}

const hora = (ms: number, lang: string) => (ms > 0 ? new Date(ms).toLocaleTimeString(lang === 'es' ? 'es-EC' : lang, { hour: '2-digit', minute: '2-digit' }) : undefined)

/** Medición sobre la imagen: un punto (valores en las dos pasadas) o un cuadrante (resumen, tabla y CSV). */
export function Mediciones({ esc, antesId, despuesId, bbox, punto, cuadrante, polarizacion, onBorrar }: Props) {
  const { t, idioma } = useT()
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
      <Tarjeta titulo={t('obs.medicion.titulo')}>
        <Vacio titulo={t('obs.medicion.nada_titulo')} texto={t('obs.medicion.nada_texto')} />
      </Tarjeta>
    )
  }

  const borrar = <Boton variante="terciario" onClick={onBorrar}>{t('obs.medicion.borrar')}</Boton>
  const filas = (m?.tabla ?? []) as Fila[]
  const enCuadrante = !!cuadrante
  const medida = m ? polarizacionMedida(m) : null
  const aSerie = new URLSearchParams(params)
  aSerie.set('vista', 'serie')
  const coordenadas = !enCuadrante && punto ? coordenadasAprox(bbox, punto, t, idioma) : null

  return (
    <Tarjeta titulo={enCuadrante ? t('obs.medicion.cuadrante_titulo') : t('obs.medicion.punto_titulo')} pie={m ? <SelloOrigen origen={m.origen} /> : undefined}>
      {coordenadas && (
        <p className="medicion__coordenadas num">
          <span className="medicion__etiqueta">{t('obs.medicion.coordenadas')}</span> {coordenadas.texto}
        </p>
      )}
      {consulta.isPending && consulta.fetchStatus !== 'idle' && <Cargando texto={t('obs.medicion.midiendo')} filas={3} />}
      {consulta.isError && (
        <ErrorBloque mensaje={mensajeDeError(consulta.error, t)}
          ultimoDato={hora(consulta.dataUpdatedAt, langDe(idioma))} onReintentar={() => void consulta.refetch()} />
      )}
      {m && enCuadrante && (
        <FranjaKpi items={m.metricas.map((x, i) => ({ etiqueta: <EtiquetaMetrica m={x} />, valor: <ValorMetrica m={x} />, unidad: x.unidad || undefined, principal: i === 0 }))} />
      )}
      {m && !enCuadrante && m.metricas.length > 0 && (
        <p className="medicion__nota">{m.metricas[0].ayuda ? <><AyudaMetrica m={m.metricas[0]} />. </> : null}{t('obs.medicion.valor_pixel')}.</p>
      )}
      {m && !enCuadrante && (
        <p className="medicion__nota">
          {t('obs.medicion.serie_antes')}<Link to={{ search: aSerie.toString() }}>{t('obs.medicion.serie_enlace')}</Link>{t('obs.medicion.serie_despues')}
        </p>
      )}
      {m && polarizacion && medida && medida !== polarizacion && <p className="medicion__nota">{t('obs.medicion.nota_polarizacion')}</p>}
      {m && filas.length > 0 && (
        <Tabla titulo={enCuadrante ? t('obs.medicion.tabla_cuadrante') : t('obs.medicion.tabla_punto')} columnas={columnasDe(filas, t, idioma)} filas={filas} porPagina={50} />
      )}
      <div className="medicion__acciones">
        {m && enCuadrante && (
          <Boton variante="secundario" onClick={() => descargarCsv(nombreCsv(esc.id, antesId, despuesId), csvDeMedicion(m, t, idioma))}>{t('obs.medicion.descargar_csv')}</Boton>
        )}
        {borrar}
      </div>
    </Tarjeta>
  )
}

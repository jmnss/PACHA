import type { UseQueryResult } from '@tanstack/react-query'
import { mensajeDeError } from '../../api/cliente'
import { useSerieSeleccion, type Escenario, type ResultadoCambio, type SerieTemporal } from '../../api/consultas'
import type { Cuadrante, Punto } from '../../comparador/Comparador'
import { Boton } from '../../diseno/Boton'
import { Cargando, ErrorBloque, Vacio } from '../../diseno/Estados'
import { NotasModelo } from '../../diseno/NotasModelo'
import { SelloOrigen } from '../../diseno/SelloOrigen'
import { Tabla } from '../../diseno/Tabla'
import { Tarjeta } from '../../diseno/Tarjeta'
import { aCsv, descargarCsv } from '../../exportar/csv'
import { esReal } from '../../diseno/origen'
import { clavesApi, textoClave } from '../../idioma/clavesApi'
import { TextoApi } from '../../idioma/TextoApi'
import { formatoHora } from '../../idioma/formato'
import { useT } from '../../idioma/useT'
import { Linea, type MarcaLinea, type SerieLinea } from '../../graficos/Linea'
import { esVerdad, parseInstante, rotulo } from '../../graficos/fechas'
import { formatoNumero } from '../../graficos/formato'
import { formatearFecha } from '../../tiempo/fechas'

type Serie = SerieTemporal

interface Props {
  esc: Escenario
  resultado: UseQueryResult<ResultadoCambio>
  antesId: string
  despuesId: string
  /** Instante (ms) de la cinta: se dibuja como cursor en cada gráfica. */
  ms?: number
  /** Selección de la vista Comparar (de la URL): si hay, se muestra primero su evolución. */
  punto?: Punto | null
  cuadrante?: Cuadrante | null
}

const limpio = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase()
const nombreCsvSerie = (escenario: string, serie: string) => `serie_${limpio(escenario)}_${limpio(serie) || 'serie'}.csv`

/** Agrupa los puntos [instante, valor, nombre] de una serie de la API por nombre, conservando el orden de aparición. */
function lineas(s: Serie, visible: (nombre: string) => string): SerieLinea[] {
  const grupos = new Map<string, [string, number | null][]>()
  for (const [t, v, nombre] of s.puntos) {
    const clave = visible(nombre || s.titulo)
    if (!grupos.has(clave)) grupos.set(clave, [])
    grupos.get(clave)!.push([t, Number.isFinite(v) ? v : null])
  }
  return [...grupos].map(([nombre, puntos]) => ({ nombre, puntos }))
}

/** Series temporales del resultado: un gráfico por serie con las pasadas «antes» y «después», su tabla y su CSV. */
export function VistaSerie({ esc, resultado, antesId, despuesId, ms, punto, cuadrante }: Props) {
  const { t, idioma } = useT()
  const seleccion = useSerieSeleccion(esc.id, { punto, cuadrante })
  if (resultado.isError) {
    return (
      <ErrorBloque
        mensaje={mensajeDeError(resultado.error, t)}
        ultimoDato={formatoHora(idioma, resultado.dataUpdatedAt)}
        onReintentar={() => void resultado.refetch()}
      />
    )
  }
  if (!antesId || !despuesId || antesId === despuesId) {
    return <Vacio titulo={t('obs.serie.sin_series')} texto={t('obs.serie.sin_pareja_texto')} />
  }
  if (resultado.isPending) return <Cargando texto={t('obs.serie.calculando')} filas={4} />
  const r = resultado.data
  if (r.series.length === 0) {
    return <Vacio titulo={t('obs.serie.sin_series')} texto={t('obs.serie.sin_series_texto')} />
  }
  const instante = (id: string) => esc.adquisiciones.find((p) => p.id === id)?.instante ?? ''
  const marcas: MarcaLinea[] = [
    ...(esc.instante_evento ? [{ instante: esc.instante_evento, etiqueta: t('obs.serie.marca_evento'), tipo: 'evento' as const }] : []),
    { instante: instante(antesId), etiqueta: t('obs.serie.marca_antes'), tipo: 'antes' as const },
    { instante: instante(despuesId), etiqueta: t('obs.serie.marca_despues'), tipo: 'despues' as const },
  ].filter((m) => m.instante)
  const cursor = ms !== undefined && Number.isFinite(ms) ? new Date(ms).toISOString() : undefined
  return (
    <div className="serie">
      {(punto || cuadrante) && <BloqueSeleccion consulta={seleccion} escenario={esc.id} marcas={marcas} cursor={cursor} />}
      {r.series.map((s, i) => (
        <BloqueSerie key={`${s.titulo}-${i}`} s={s} escenario={esc.id} marcas={marcas} cursor={cursor} />
      ))}
      {r.notas.length > 0 && (
        <Tarjeta titulo={t('obs.comparar.como_leer')} pie={<SelloOrigen origen={r.origen} />}>
          <NotasModelo notas={r.notas} escenarioId={esc.id} textos={r.notas_texto} />
        </Tarjeta>
      )}
    </div>
  )
}

/** La serie del punto o cuadrante elegidos: el mismo bloque que las del escenario, o su estado de carga, error o vacío. */
function BloqueSeleccion({ consulta, escenario, marcas, cursor }: { consulta: UseQueryResult<SerieTemporal | null>; escenario: string; marcas: MarcaLinea[]; cursor?: string }) {
  const { t, idioma } = useT()
  const titulo = t('obs.serie.seleccion_titulo')
  if (consulta.isError) {
    return (
      <Tarjeta titulo={titulo}>
        <ErrorBloque mensaje={mensajeDeError(consulta.error, t)} ultimoDato={formatoHora(idioma, consulta.dataUpdatedAt)} onReintentar={() => void consulta.refetch()} />
      </Tarjeta>
    )
  }
  if (consulta.isPending) return <Tarjeta titulo={titulo}><Cargando texto={t('obs.serie.seleccion_calculando')} filas={3} /></Tarjeta>
  const s = consulta.data
  if (!s || s.puntos.length === 0) {
    return <Tarjeta titulo={titulo}><Vacio titulo={t('obs.serie.seleccion_vacia_titulo')} texto={t('obs.serie.seleccion_vacia_texto')} /></Tarjeta>
  }
  return <BloqueSerie s={s} escenario={escenario} marcas={marcas} cursor={cursor} titulo={titulo} aviso={t('obs.serie.seleccion_aviso_pol')} archivo="seleccion" />
}

function BloqueSerie({ s, escenario, marcas, cursor, titulo, aviso, archivo }: { s: Serie; escenario: string; marcas: MarcaLinea[]; cursor?: string; titulo?: string; aviso?: string; archivo?: string }) {
  const { t, idioma, textoApi } = useT()
  const sint = !esReal(s.origen)
  // Nombre de cada línea en el idioma activo si la API trae su clave; la «verdad» se deja en español porque
  // `rotulo` la reconoce y la nombra como verdad sintética.
  const nombre = (n: string) => {
    if (esVerdad(n, sint)) return { texto: n, traducido: true }
    const x = textoClave(s.nombres_texto?.[n])
    return textoApi(n, x.clave, x.valores, x.decimales)
  }
  const series = lineas(s, (n) => nombre(n).texto)
  // Una fila por punto; la columna «Serie» lleva el rótulo honesto (la verdad sintética se nombra como tal).
  const filas = s.puntos
    .map(([ins, v, nom]) => ({ ms: parseInstante(ins), instante: ins, valor: v, serie: rotulo(nombre(nom || s.titulo).texto, sint, t), api: !nombre(nom || s.titulo).traducido }))
    .sort((a, b) => a.ms - b.ms || a.serie.localeCompare(b.serie))
    .map((f) => ({ fecha: formatearFecha(f.instante, idioma) ?? f.instante, valor: f.valor, serie: f.serie, api: f.api }))
  const dec = filas.every((f) => Number.isInteger(f.valor)) ? 0 : 2
  const [cFecha, cValor, cSerie] = [t('obs.serie.col_fecha'), t('obs.serie.col_valor', { unidad: s.unidad }), t('obs.serie.col_serie')]
  const columnas = [
    { clave: 'fecha', etiqueta: cFecha, identidad: true },
    { clave: 'valor', etiqueta: cValor, numerica: true, formato: (v: unknown) => (typeof v === 'number' ? formatoNumero(v, dec, idioma) : '') },
    { clave: 'serie', etiqueta: cSerie, formato: (v: unknown, f: { api: boolean }) => (f.api ? <TextoApi texto={String(v)} /> : String(v)) },
  ]
  const descargar = () => {
    const csv = filas.map((f) => ({ [cFecha]: f.fecha, [cValor]: f.valor, [cSerie]: f.serie }))
    descargarCsv(nombreCsvSerie(escenario, archivo ?? s.titulo), aCsv(csv, [cFecha, cValor, cSerie], s.origen, idioma))
  }
  const hayVerdad = series.some((x) => esVerdad(x.nombre, sint))
  return (
    <Tarjeta titulo={titulo ?? <TextoApi texto={s.titulo} clave={clavesApi.serie(s.titulo)} />}>
      {titulo && <p className="serie__nota"><TextoApi texto={s.titulo} clave={clavesApi.serie(s.titulo)} /></p>}
      <Linea series={series} marcas={marcas} cursor={cursor} unidad={s.unidad} origen={s.origen} titulo={s.titulo} />
      {aviso && <p className="serie__nota">{aviso}</p>}
      {hayVerdad && <p className="serie__nota">{t('obs.serie.nota_verdad')}</p>}
      <Tabla titulo={t('obs.serie.valores_de', { titulo: s.titulo })} columnas={columnas} filas={filas} porPagina={50} />
      <div><Boton variante="secundario" onClick={descargar}>{t('obs.medicion.descargar_csv')}</Boton></div>
    </Tarjeta>
  )
}

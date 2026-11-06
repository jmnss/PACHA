import type { UseQueryResult } from '@tanstack/react-query'
import { mensajeDeError } from '../../api/cliente'
import type { Escenario, ResultadoCambio } from '../../api/consultas'
import { Boton } from '../../diseno/Boton'
import { Cargando, ErrorBloque, Vacio } from '../../diseno/Estados'
import { NotasModelo } from '../../diseno/NotasModelo'
import { SelloOrigen } from '../../diseno/SelloOrigen'
import { Tabla } from '../../diseno/Tabla'
import { Tarjeta } from '../../diseno/Tarjeta'
import { aCsv, descargarCsv } from '../../exportar/csv'
import { esReal } from '../../diseno/origen'
import { TextoApi } from '../../idioma/TextoApi'
import { formatoHora } from '../../idioma/formato'
import { useT } from '../../idioma/useT'
import { Linea, type MarcaLinea, type SerieLinea } from '../../graficos/Linea'
import { esVerdad, parseInstante, rotulo } from '../../graficos/fechas'
import { formatoNumero } from '../../graficos/formato'
import { formatearFecha } from '../../tiempo/fechas'

type Serie = ResultadoCambio['series'][number]

interface Props {
  esc: Escenario
  resultado: UseQueryResult<ResultadoCambio>
  antesId: string
  despuesId: string
}

const limpio = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase()
const nombreCsvSerie = (escenario: string, serie: string) => `serie_${limpio(escenario)}_${limpio(serie) || 'serie'}.csv`

/** Agrupa los puntos [instante, valor, nombre] de una serie de la API por nombre, conservando el orden de aparición. */
function lineas(s: Serie): SerieLinea[] {
  const grupos = new Map<string, [string, number | null][]>()
  for (const [t, v, nombre] of s.puntos) {
    const clave = nombre || s.titulo
    if (!grupos.has(clave)) grupos.set(clave, [])
    grupos.get(clave)!.push([t, Number.isFinite(v) ? v : null])
  }
  return [...grupos].map(([nombre, puntos]) => ({ nombre, puntos }))
}

/** Series temporales del resultado: un gráfico por serie con las pasadas «antes» y «después», su tabla y su CSV. */
export function VistaSerie({ esc, resultado, antesId, despuesId }: Props) {
  const { t, idioma } = useT()
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
    { instante: instante(antesId), etiqueta: t('obs.serie.marca_antes'), tipo: 'antes' as const },
    { instante: instante(despuesId), etiqueta: t('obs.serie.marca_despues'), tipo: 'despues' as const },
  ].filter((m) => m.instante)
  return (
    <div className="serie">
      {r.series.map((s, i) => (
        <BloqueSerie key={`${s.titulo}-${i}`} s={s} escenario={esc.id} marcas={marcas} />
      ))}
      {r.notas.length > 0 && (
        <Tarjeta titulo={t('obs.comparar.como_leer')} pie={<SelloOrigen origen={r.origen} />}>
          <NotasModelo notas={r.notas} escenarioId={esc.id} />
        </Tarjeta>
      )}
    </div>
  )
}

function BloqueSerie({ s, escenario, marcas }: { s: Serie; escenario: string; marcas: MarcaLinea[] }) {
  const { t, idioma } = useT()
  const sint = !esReal(s.origen)
  const series = lineas(s)
  // Una fila por punto; la columna «Serie» lleva el rótulo honesto (la verdad sintética se nombra como tal).
  const filas = s.puntos
    .map(([ins, v, nombre]) => ({ ms: parseInstante(ins), instante: ins, valor: v, serie: rotulo(nombre || s.titulo, sint, t), api: !esVerdad(nombre || s.titulo, sint) }))
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
    descargarCsv(nombreCsvSerie(escenario, s.titulo), aCsv(csv, [cFecha, cValor, cSerie], s.origen, idioma))
  }
  const hayVerdad = series.some((x) => esVerdad(x.nombre, sint))
  return (
    <Tarjeta titulo={<TextoApi texto={s.titulo} />}>
      <Linea series={series} marcas={marcas} unidad={s.unidad} origen={s.origen} titulo={s.titulo} />
      {hayVerdad && <p className="serie__nota">{t('obs.serie.nota_verdad')}</p>}
      <Tabla titulo={t('obs.serie.valores_de', { titulo: s.titulo })} columnas={columnas} filas={filas} porPagina={50} />
      <div><Boton variante="secundario" onClick={descargar}>{t('obs.medicion.descargar_csv')}</Boton></div>
    </Tarjeta>
  )
}

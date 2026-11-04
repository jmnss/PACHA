import type { UseQueryResult } from '@tanstack/react-query'
import { ErrorApi, MENSAJE_RED } from '../../api/cliente'
import type { Escenario, ResultadoCambio } from '../../api/consultas'
import { Boton } from '../../diseno/Boton'
import { Cargando, ErrorBloque, Vacio } from '../../diseno/Estados'
import { NotasModelo } from '../../diseno/NotasModelo'
import { SelloOrigen } from '../../diseno/SelloOrigen'
import { Tabla } from '../../diseno/Tabla'
import { Tarjeta } from '../../diseno/Tarjeta'
import { aCsv, descargarCsv } from '../../exportar/csv'
import { esReal } from '../../diseno/origen'
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
const hora = (ms: number) => (ms > 0 ? new Date(ms).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }) : undefined)
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
  if (resultado.isError) {
    const e = resultado.error
    return (
      <ErrorBloque
        mensaje={e instanceof ErrorApi ? e.mensaje : MENSAJE_RED}
        ultimoDato={hora(resultado.dataUpdatedAt)}
        onReintentar={() => void resultado.refetch()}
      />
    )
  }
  if (!antesId || !despuesId || antesId === despuesId) {
    return <Vacio titulo="Sin series" texto="Este escenario necesita al menos dos pasadas distintas para calcular sus series." />
  }
  if (resultado.isPending) return <Cargando texto="Calculando las series…" filas={4} />
  const r = resultado.data
  if (r.series.length === 0) {
    return <Vacio titulo="Sin series" texto="Este escenario no devuelve series temporales. Prueba con la vista Mapa o con otro escenario." />
  }
  const instante = (id: string) => esc.adquisiciones.find((p) => p.id === id)?.instante ?? ''
  const marcas: MarcaLinea[] = [
    { instante: instante(antesId), etiqueta: 'antes', tipo: 'antes' as const },
    { instante: instante(despuesId), etiqueta: 'después', tipo: 'despues' as const },
  ].filter((m) => m.instante)
  return (
    <div className="serie">
      {r.series.map((s, i) => (
        <BloqueSerie key={`${s.titulo}-${i}`} s={s} escenario={esc.id} marcas={marcas} />
      ))}
      {r.notas.length > 0 && (
        <Tarjeta titulo="Cómo leer esto" pie={<SelloOrigen origen={r.origen} />}>
          <NotasModelo notas={r.notas} />
        </Tarjeta>
      )}
    </div>
  )
}

function BloqueSerie({ s, escenario, marcas }: { s: Serie; escenario: string; marcas: MarcaLinea[] }) {
  const sint = !esReal(s.origen)
  const series = lineas(s)
  // Una fila por punto; la columna «Serie» lleva el rótulo honesto (la verdad sintética se nombra como tal).
  const filas = s.puntos
    .map(([t, v, nombre]) => ({ t: parseInstante(t), instante: t, valor: v, serie: rotulo(nombre || s.titulo, sint) }))
    .sort((a, b) => a.t - b.t || a.serie.localeCompare(b.serie))
    .map((f) => ({ fecha: formatearFecha(f.instante) ?? f.instante, valor: f.valor, serie: f.serie }))
  const dec = filas.every((f) => Number.isInteger(f.valor)) ? 0 : 2
  const columnas = [
    { clave: 'fecha', etiqueta: 'Fecha', identidad: true },
    { clave: 'valor', etiqueta: `Valor (${s.unidad})`, numerica: true, formato: (v: unknown) => (typeof v === 'number' ? formatoNumero(v, dec) : '') },
    { clave: 'serie', etiqueta: 'Serie' },
  ]
  const descargar = () => {
    const csv = filas.map((f) => ({ Fecha: f.fecha, [`Valor (${s.unidad})`]: f.valor, Serie: f.serie }))
    descargarCsv(nombreCsvSerie(escenario, s.titulo), aCsv(csv, ['Fecha', `Valor (${s.unidad})`, 'Serie'], s.origen))
  }
  const hayVerdad = series.some((x) => esVerdad(x.nombre, sint))
  return (
    <Tarjeta titulo={s.titulo}>
      <Linea series={series} marcas={marcas} unidad={s.unidad} origen={s.origen} titulo={s.titulo} />
      {hayVerdad && <p className="serie__nota">La línea punteada es la verdad sintética del modelo de demostración, no una medición.</p>}
      <Tabla titulo={`Valores de ${s.titulo}`} columnas={columnas} filas={filas} porPagina={50} />
      <div><Boton variante="secundario" onClick={descargar}>Descargar CSV</Boton></div>
    </Tarjeta>
  )
}

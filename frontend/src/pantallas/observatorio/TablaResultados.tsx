import type { ResultadoCambio } from '../../api/consultas'
import { Boton } from '../../diseno/Boton'
import { SelloOrigen } from '../../diseno/SelloOrigen'
import { Tabla } from '../../diseno/Tabla'
import { Tarjeta } from '../../diseno/Tarjeta'
import { aCsv, descargarCsv } from '../../exportar/csv'
import { formatoNumero } from '../../graficos/formato'
import { textoClave, type TextoClaveApi } from '../../idioma/clavesApi'
import { TextoApi } from '../../idioma/TextoApi'
import { useT } from '../../idioma/useT'

/** Clave de la fila donde viajan los `TextoClave` de sus celdas (no es una columna). */
const CELDAS = '__celdas_texto'
const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/

type Resultado = ResultadoCambio['tablas'][number]

const limpio = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase()

/** Tabla de resultados de la API (p. ej. una fila por parcela): una columna por métrica, paginada desde 50 filas, con CSV. */
export function TablaResultados({ tabla, escenario }: { tabla: Resultado; escenario: string }) {
  const { t, idioma, textoApi, formatoFecha } = useT()
  // Nombres únicos: dos columnas con el mismo rótulo no se pisan (la segunda lleva «(2)», etc.).
  const vistos = new Map<string, number>()
  const nombres = tabla.columnas.map((c) => {
    const n = (vistos.get(c) ?? 0) + 1
    vistos.set(c, n)
    return n === 1 ? c : `${c} (${n})`
  })
  const filas = tabla.filas.map((f, r) => ({
    ...Object.fromEntries(nombres.map((c, i) => [c, f[i] ?? null])),
    [CELDAS]: Object.fromEntries(nombres.map((c, i) => [c, tabla.celdas_texto?.[r]?.[i] ?? null])),
  }))
  const columnas = nombres.map((c, i) => {
    const tc = textoClave(tabla.columnas_texto?.[i])
    const encabezado = textoApi(tabla.columnas[i], tc.clave, tc.valores, tc.decimales)
    const numerica = tabla.filas.every((f) => f[i] === null || f[i] === undefined || typeof f[i] === 'number')
    const dec = tabla.filas.every((f) => typeof f[i] !== 'number' || Number.isInteger(f[i])) ? 0 : 2
    return {
      clave: c, etiqueta: encabezado.texto + c.slice(tabla.columnas[i].length),
      langEncabezado: encabezado.traducido ? undefined : 'es', identidad: i === 0, numerica,
      formato: numerica
        ? (v: unknown) => (typeof v === 'number' ? formatoNumero(v, dec, idioma) : '')
        : (v: unknown, f: Record<string, unknown>) => {
          if (typeof v !== 'string') return null
          // Las fechas viajan en ISO: se escriben a la manera del idioma, no son texto del modelo.
          if (FECHA_ISO.test(v)) return formatoFecha(v, 'larga')
          const x = textoClave((f[CELDAS] as Record<string, TextoClaveApi | null>)[c])
          return <TextoApi texto={v} clave={x.clave} valores={x.valores} decimales={x.decimales} />
        },
    }
  })
  const tituloT = textoClave(tabla.titulo_texto)
  // El CSV lleva los mismos textos que la pantalla: encabezados y celdas pasan por `textoApi` (las fechas siguen en ISO).
  const etiquetas = columnas.map((c) => c.etiqueta)
  const descargar = () => {
    const csv = tabla.filas.map((f, r) => Object.fromEntries(etiquetas.map((e, i) => {
      const v = f[i] ?? null
      if (typeof v !== 'string' || FECHA_ISO.test(v)) return [e, v]
      const x = textoClave(tabla.celdas_texto?.[r]?.[i])
      return [e, textoApi(v, x.clave, x.valores, x.decimales).texto]
    })))
    descargarCsv(`${limpio(tabla.titulo) || 'tabla'}_${limpio(escenario)}.csv`, aCsv(csv, etiquetas, tabla.origen, idioma))
  }
  return (
    <Tarjeta titulo={<TextoApi texto={tabla.titulo} clave={tituloT.clave} valores={tituloT.valores} decimales={tituloT.decimales} />} pie={<SelloOrigen origen={tabla.origen} />}>
      <Tabla titulo={textoApi(tabla.titulo, tituloT.clave, tituloT.valores, tituloT.decimales).texto} columnas={columnas} filas={filas} porPagina={50} />
      <div><Boton variante="secundario" onClick={descargar}>{t('obs.medicion.descargar_csv')}</Boton></div>
    </Tarjeta>
  )
}

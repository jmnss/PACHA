import type { ResultadoCambio } from '../../api/consultas'
import { Boton } from '../../diseno/Boton'
import { SelloOrigen } from '../../diseno/SelloOrigen'
import { Tabla } from '../../diseno/Tabla'
import { Tarjeta } from '../../diseno/Tarjeta'
import { aCsv, descargarCsv } from '../../exportar/csv'
import { formatoNumero } from '../../graficos/formato'

type Resultado = ResultadoCambio['tablas'][number]

const limpio = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase()

/** Tabla de resultados de la API (p. ej. una fila por parcela): una columna por métrica, paginada desde 50 filas, con CSV. */
export function TablaResultados({ tabla, escenario }: { tabla: Resultado; escenario: string }) {
  const filas = tabla.filas.map((f) => Object.fromEntries(tabla.columnas.map((c, i) => [c, f[i] ?? null])))
  const columnas = tabla.columnas.map((c, i) => {
    const numerica = tabla.filas.every((f) => f[i] === null || f[i] === undefined || typeof f[i] === 'number')
    const dec = tabla.filas.every((f) => typeof f[i] !== 'number' || Number.isInteger(f[i])) ? 0 : 2
    return {
      clave: c, etiqueta: c, identidad: i === 0, numerica,
      formato: numerica ? (v: unknown) => (typeof v === 'number' ? formatoNumero(v, dec) : '') : undefined,
    }
  })
  const descargar = () => descargarCsv(`${limpio(tabla.titulo) || 'tabla'}_${limpio(escenario)}.csv`, aCsv(filas, tabla.columnas, tabla.origen))
  return (
    <Tarjeta titulo={tabla.titulo} pie={<SelloOrigen origen={tabla.origen} />}>
      <Tabla titulo={tabla.titulo} columnas={columnas} filas={filas} porPagina={50} />
      <div><Boton variante="secundario" onClick={descargar}>Descargar CSV</Boton></div>
    </Tarjeta>
  )
}

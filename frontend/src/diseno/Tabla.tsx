import { useState, type ReactNode } from 'react'
import { useT } from '../idioma/useT'

export interface ColumnaTabla<F> {
  clave: string
  etiqueta: string
  /** Idioma del contenido de la columna si no es el de la interfaz (texto escrito por el modelo en español). */
  lang?: string
  numerica?: boolean
  /** Primera columna: identidad, en blanco. */
  identidad?: boolean
  formato?: (valor: unknown, fila: F) => ReactNode
}

interface Props<F extends Record<string, unknown>> {
  columnas: ColumnaTabla<F>[]
  filas: F[]
  /** Descripción para lectores de pantalla. */
  titulo: string
  /** Filas por página; con más filas aparece «1–50 de N» y la cabecera queda fija. */
  porPagina?: number
}

/** Tabla de docs/diseno.md §8: números a la derecha y tabulares, valor ausente = guion gris. */
export function Tabla<F extends Record<string, unknown>>({ columnas, filas, titulo, porPagina = 50 }: Props<F>) {
  const { t, formatoNumero } = useT()
  const AUSENTE = <span className="tabla__ausente" aria-label={t('estructura.tabla.sin_dato')}>—</span>
  const [pagina, setPagina] = useState(0)
  const paginada = filas.length > porPagina
  const total = filas.length
  const desde = paginada ? pagina * porPagina : 0
  const hasta = paginada ? Math.min(desde + porPagina, total) : total
  const visibles = filas.slice(desde, hasta)

  return (
    <div className="tabla">
      <div className={`tabla__marco${paginada ? ' tabla__marco--fijo' : ''}`} tabIndex={paginada ? 0 : undefined} role={paginada ? 'region' : undefined} aria-label={paginada ? titulo : undefined}>
        <table>
          <caption className="solo-lectores">{titulo}</caption>
          <thead>
            <tr>
              {columnas.map((c) => (
                <th key={c.clave} scope="col" lang={c.lang} className={c.numerica ? 'tabla__num' : undefined}>
                  {c.etiqueta}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibles.map((f, i) => (
              <tr key={desde + i}>
                {columnas.map((c) => {
                  const v = f[c.clave]
                  const vacio = v === null || v === undefined || v === ''
                  const clases = [c.numerica ? 'tabla__num num' : '', c.identidad ? 'tabla__identidad' : '']
                    .filter(Boolean)
                    .join(' ')
                  return (
                    <td key={c.clave} lang={c.lang} className={clases || undefined} data-etiqueta={c.etiqueta}>
                      {vacio ? AUSENTE : c.formato ? c.formato(v, f) : String(v)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {paginada && (
        <div className="tabla__pie">
          <span className="num" aria-live="polite">
            {t('estructura.tabla.rango', { desde: formatoNumero(desde + 1), hasta: formatoNumero(hasta), total: formatoNumero(total) })}
          </span>
          <div className="tabla__paginas">
            <button type="button" className="boton boton--secundario" disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)}>
              {t('estructura.tabla.anterior')}
            </button>
            <button type="button" className="boton boton--secundario" disabled={hasta >= total} onClick={() => setPagina((p) => p + 1)}>
              {t('estructura.tabla.siguiente')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

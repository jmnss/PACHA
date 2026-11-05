import { Boton } from '../../diseno/Boton'
import { Tabla, type ColumnaTabla } from '../../diseno/Tabla'
import { Tarjeta } from '../../diseno/Tarjeta'
import type { Origen } from '../../diseno/origen'
import { descargarCsv } from '../../exportar/csv'
import { COLUMNAS_BITACORA, csvBitacora, filasBitacora, type EntradaBitacora } from './bitacora'

const COLUMNAS: ColumnaTabla<Record<string, unknown>>[] = COLUMNAS_BITACORA.map((c, k) => ({
  clave: c, etiqueta: c, identidad: k === 0, numerica: ['Área (km²)', 'Expuestos', 'Víctimas', 'Pérdidas (M USD)'].includes(c),
}))

interface Props { entradas: EntradaBitacora[]; origen: Origen; onVaciar: () => void }

/** Registro de los eventos desatados; vive en el navegador y se exporta con su marca de origen. */
export function Bitacora({ entradas, origen, onVaciar }: Props) {
  if (entradas.length === 0) return null
  return (
    <Tarjeta titulo="Bitácora de eventos">
      <Tabla columnas={COLUMNAS} filas={filasBitacora(entradas)} titulo="Eventos simulados en este navegador" porPagina={10} />
      <div className="simulador__acciones">
        <Boton variante="secundario" onClick={() => descargarCsv('bitacora-simulador.csv', csvBitacora(entradas, origen))}>Descargar CSV</Boton>
        <Boton variante="terciario" onClick={onVaciar}>Vaciar la bitácora</Boton>
      </div>
    </Tarjeta>
  )
}

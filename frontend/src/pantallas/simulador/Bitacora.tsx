import { Boton } from '../../diseno/Boton'
import { Tabla, type ColumnaTabla } from '../../diseno/Tabla'
import { Tarjeta } from '../../diseno/Tarjeta'
import type { Origen } from '../../diseno/origen'
import { descargarCsv } from '../../exportar/csv'
import { clavesApi } from '../../idioma/clavesApi'
import { TextoApi } from '../../idioma/TextoApi'
import { useT } from '../../idioma/useT'
import { COLUMNAS_BITACORA, coordenadas, csvBitacora, etiquetaColumna, filasBitacora, type EntradaBitacora } from './bitacora'

const NUMERICAS: readonly string[] = ['Área (km²)', 'Expuestos', 'Víctimas', 'Pérdidas (M USD)']

interface Props { entradas: EntradaBitacora[]; origen: Origen; onVaciar: () => void }

/** Registro de los eventos desatados; vive en el navegador y se exporta con su marca de origen. */
export function Bitacora({ entradas, origen, onVaciar }: Props) {
  const { t, idioma } = useT()
  if (entradas.length === 0) return null
  const texto = (v: unknown) => <TextoApi texto={String(v)} />
  const columnas: ColumnaTabla<Record<string, unknown>>[] = COLUMNAS_BITACORA.map((c, k) => ({
    clave: c, etiqueta: etiquetaColumna(c, t), identidad: k === 0, numerica: NUMERICAS.includes(c),
    formato: c === 'Lugar'
      ? (_v, f) => {
          const e = f._entrada as EntradaBitacora
          return e.lat !== undefined && e.lon !== undefined && e.region !== undefined
            ? <>{coordenadas(e.lat, e.lon, t)} · <TextoApi texto={e.region} /></>
            : texto(e.lugar)
        }
      : c === 'Evento'
        ? (_v, f) => { const e = f._entrada as EntradaBitacora; return <TextoApi texto={e.titulo} clave={e.titulo_clave} valores={e.titulo_valores} /> }
        : c === 'Temporada'
          ? (_v, f) => { const e = f._entrada as EntradaBitacora; return <TextoApi texto={e.temporada} clave={clavesApi.contexto('temporada', e.temporada)} /> }
          : c === 'Detección del radar' ? texto : undefined,
  }))
  const filas = filasBitacora(entradas, t).map((f, k) => ({ ...f, _entrada: entradas[k] }))
  return (
    <Tarjeta titulo={t('sim.bitacora.titulo')}>
      <Tabla columnas={columnas} filas={filas} titulo={t('sim.bitacora.tabla')} porPagina={10} />
      <div className="simulador__acciones">
        <Boton variante="secundario" onClick={() => descargarCsv('bitacora-simulador.csv', csvBitacora(entradas, origen, t, idioma))}>{t('sim.bitacora.descargar')}</Boton>
        <Boton variante="terciario" onClick={onVaciar}>{t('sim.bitacora.vaciar')}</Boton>
      </div>
    </Tarjeta>
  )
}

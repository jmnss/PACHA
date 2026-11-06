import { Fragment } from 'react'
import { CabeceraPantalla } from '../../diseno/CabeceraPantalla'
import { Tabla, type ColumnaTabla } from '../../diseno/Tabla'
import { Tarjeta } from '../../diseno/Tarjeta'
import { Termino } from '../../diseno/Termino'
import { useTituloPagina } from '../../estado/useTituloPagina'
import { useT } from '../../idioma/useT'
import { contenidoDe, type Banda, type Fenomeno, type Parrafo } from './contenido'
import './fundamentos.css'

const parrafo = (p: Parrafo) =>
  p.map((s, i) => (typeof s === 'string' ? <Fragment key={i}>{s}</Fragment> : <Termino key={i} nombre={s.nombre} explicacion={s.explicacion} />))

/** Fundamentos: la física del radar en lenguaje llano y lo que de NISAR queda por confirmar. */
export default function Fundamentos() {
  const { t, idioma } = useT()
  useTituloPagina('titulos.fundamentos')
  const c = contenidoDe(idioma)
  const COL_FEN: ColumnaTabla<Fenomeno & Record<string, unknown>>[] = [
    { clave: 'cambio', etiqueta: t('fundamentos.col.cambio'), identidad: true },
    { clave: 'pol', etiqueta: t('fundamentos.col.pol') },
    { clave: 'que_ve', etiqueta: t('fundamentos.col.que_ve') },
  ]
  const COL_BANDAS: ColumnaTabla<Banda & Record<string, unknown>>[] = [
    { clave: 'nombre', etiqueta: t('fundamentos.col.banda'), identidad: true },
    { clave: 'longitud', etiqueta: t('fundamentos.col.longitud') },
    { clave: 'nota', etiqueta: t('fundamentos.col.nota') },
  ]
  return (
    <>
      <CabeceraPantalla titulo={t('fundamentos.titulo')} hallazgo={t('fundamentos.hallazgo')} />
      <div className="fundamentos">
        <Tarjeta titulo={t('fundamentos.tarjeta.radar')}>
          <p className="fundamentos__texto" data-contenido-largo>{parrafo(c.radar[0])}</p>
          <p className="fundamentos__texto" data-contenido-largo>{parrafo(c.radar[1])}</p>
        </Tarjeta>
        <Tarjeta titulo={t('fundamentos.tarjeta.cambios')}>
          <div data-contenido-largo>
            <Tabla columnas={COL_FEN} filas={c.fenomenos as (Fenomeno & Record<string, unknown>)[]} titulo={t('fundamentos.tabla.cambios')} />
          </div>
          <p className="fundamentos__nota">{t('fundamentos.nota.cambios')}</p>
        </Tarjeta>
        <Tarjeta titulo={t('fundamentos.tarjeta.pol_bandas')}>
          <p className="fundamentos__texto" data-contenido-largo>{parrafo(c.polBandas)}</p>
          <div data-contenido-largo>
            <Tabla columnas={COL_BANDAS} filas={c.bandas as (Banda & Record<string, unknown>)[]} titulo={t('fundamentos.tabla.bandas')} />
          </div>
          <p className="fundamentos__nota">{t('fundamentos.nota.bandas')}</p>
        </Tarjeta>
        <Tarjeta titulo={t('fundamentos.tarjeta.mision')}>
          <p className="fundamentos__texto" data-contenido-largo>{parrafo(c.mision)}</p>
          <p className="fundamentos__nota">{t('fundamentos.nota.mision')}</p>
        </Tarjeta>
      </div>
    </>
  )
}

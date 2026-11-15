import { useEffect, useId, useRef, useState } from 'react'
import { Boton } from '../../diseno/Boton'
import { Tabla, type ColumnaTabla } from '../../diseno/Tabla'
import { Tarjeta } from '../../diseno/Tarjeta'
import type { Origen } from '../../diseno/origen'
import { descargarCsv } from '../../exportar/csv'
import { clavesApi } from '../../idioma/clavesApi'
import { cifrasEnIdioma } from '../../idioma/metricaTexto'
import { TextoApi } from '../../idioma/TextoApi'
import { useT } from '../../idioma/useT'
import { claveDeTitulo, COLUMNAS_BITACORA, coordenadas, csvBitacora, etiquetaColumna, filasBitacora, type EntradaBitacora } from './bitacora'

const NUMERICAS: readonly string[] = ['Área (km²)', 'Expuestos', 'Víctimas', 'Pérdidas (M USD)']

interface Props { entradas: EntradaBitacora[]; origen: Origen; onVaciar: () => void }

/** Registro de los eventos desatados; vive en el navegador y se exporta con su marca de origen. */
export function Bitacora({ entradas, origen, onVaciar }: Props) {
  const ctx = useT()
  const { t, idioma } = ctx
  // Vaciar borra lo guardado sin vuelta atrás: se pide confirmación en línea (UX-18). Al abrirla el foco va a
  // «Cancelar» (lo seguro); al cerrarla vuelve al botón «Vaciar»; Escape cancela.
  const [confirmando, setConfirmando] = useState(false)
  const idPregunta = useId()
  const cancelar = useRef<HTMLButtonElement>(null)
  const vaciar = useRef<HTMLButtonElement>(null)
  const abierta = useRef(false)
  useEffect(() => {
    if (confirmando) cancelar.current?.focus()
    else if (abierta.current) vaciar.current?.focus()
    abierta.current = confirmando
  }, [confirmando])
  if (entradas.length === 0) return null
  const texto = (v: unknown) => <TextoApi texto={String(v)} />
  const columnas: ColumnaTabla<Record<string, unknown>>[] = COLUMNAS_BITACORA.map((c, k) => ({
    clave: c, etiqueta: etiquetaColumna(c, t), identidad: k === 0, numerica: NUMERICAS.includes(c),
    formato: c === 'Lugar'
      ? (_v, f) => {
          const e = f._entrada as EntradaBitacora
          return e.lat !== undefined && e.lon !== undefined && e.region !== undefined
            ? <>{coordenadas(e.lat, e.lon, t)} · <TextoApi texto={e.region} clave={clavesApi.contexto('region', e.region)} /></>
            : texto(e.lugar)
        }
      : c === 'Evento'
        ? (_v, f) => { const e = f._entrada as EntradaBitacora; const { clave, valores } = claveDeTitulo(e); return <TextoApi texto={e.titulo} clave={clave} valores={valores} /> }
        : c === 'Temporada'
          ? (_v, f) => { const e = f._entrada as EntradaBitacora; return <TextoApi texto={e.temporada} clave={clavesApi.contexto('temporada', e.temporada)} /> }
          : c === 'Detección del radar' ? (_v, f) => cifrasEnIdioma((f._entrada as EntradaBitacora).deteccion, ctx) : undefined,
  }))
  const filas = filasBitacora(entradas, ctx).map((f, k) => ({ ...f, _entrada: entradas[k] }))
  return (
    <Tarjeta titulo={t('sim.bitacora.titulo')}>
      <Tabla columnas={columnas} filas={filas} titulo={t('sim.bitacora.tabla')} porPagina={10} />
      <div className="simulador__acciones">
        <Boton variante="secundario" onClick={() => descargarCsv('bitacora-simulador.csv', csvBitacora(entradas, origen, ctx, idioma))}>{t('sim.bitacora.descargar')}</Boton>
        {!confirmando && <button ref={vaciar} type="button" className="boton boton--terciario" onClick={() => setConfirmando(true)}>{t('sim.bitacora.vaciar')}</button>}
      </div>
      {confirmando && (
        <div className="simulador__confirmar" role="group" aria-labelledby={idPregunta}
          onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); setConfirmando(false) } }}>
          <p id={idPregunta} className="simulador__nota">{t('sim.bitacora.vaciar_pregunta')}</p>
          <div className="simulador__acciones">
            <button ref={cancelar} type="button" className="boton boton--secundario" onClick={() => setConfirmando(false)}>{t('sim.bitacora.vaciar_no')}</button>
            <Boton variante="terciario" onClick={() => { setConfirmando(false); onVaciar() }}>{t('sim.bitacora.vaciar_si')}</Boton>
          </div>
        </div>
      )}
    </Tarjeta>
  )
}

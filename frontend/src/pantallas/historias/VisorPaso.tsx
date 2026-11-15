import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { mensajeDeError } from '../../api/cliente'
import type { CapaDto } from '../../api/consultas'
import { Comparador } from '../../comparador/Comparador'
import { pintarPar } from '../../comparador/pintar'
import { Cargando, ErrorBloque } from '../../diseno/Estados'
import { Leyenda } from '../../diseno/Leyenda'
import { SelloOrigen } from '../../diseno/SelloOrigen'
import { useT } from '../../idioma/useT'
import { estiloDeCapa } from '../observatorio/derivados'

interface Consulta<T> {
  data: T | undefined
  isError: boolean
  error: unknown
  refetch: () => unknown
}

interface Props {
  /** «Qué estás viendo» en este paso. */
  queVes: string
  /** `null`: el escenario no tiene capas para este paso. */
  modo: 'par' | 'sola' | null
  a: Consulta<CapaDto>
  b: Consulta<CapaDto>
  etiquetaA: string
  etiquetaB: string
  titulo: string
  /** Controles bajo la imagen (polarización, capa). */
  controles?: ReactNode
}

/** Una capa sola (p. ej. la máscara de quemado o el ΔRFDI de la fecha «después»), con su leyenda y su sello. */
function CapaSola({ capa, etiqueta, titulo }: { capa: CapaDto; etiqueta: string; titulo: string }) {
  const { t } = useT()
  const lienzo = useRef<HTMLCanvasElement>(null)
  const estilo = estiloDeCapa(capa)
  const px = useMemo(() => pintarPar(capa.rejilla, capa.rejilla, estilo.rampa, estilo.categorias, t), [capa, estilo.rampa, estilo.categorias, t])
  useEffect(() => {
    const c = lienzo.current
    if (!c) return
    c.width = px.antes.width
    c.height = px.antes.height
    c.getContext('2d')?.putImageData(px.antes, 0, 0)
  }, [px])
  const paleta = estilo.categorias ? 'categorias' : capa.paleta === 'divergente' ? 'divergente' : capa.paleta === 'gris' ? 'gris' : 'secuencial'
  return (
    <figure className="comparador">
      <figcaption className="comparador__titulo">{titulo}</figcaption>
      <div className="comparador__escenario" style={{ aspectRatio: `${capa.rejilla.columnas} / ${capa.rejilla.filas}` }}>
        <canvas ref={lienzo} className="comparador__lienzo" role="img" aria-label={`${titulo} · ${etiqueta}`} />
        <span className="comparador__fecha comparador__fecha--antes">{etiqueta}</span>
      </div>
      <Leyenda paleta={paleta} vmin={px.vmin} vmax={px.vmax} unidad={capa.unidad} variable={capa.variable} leyenda={capa.leyenda}
        extremos={capa.variable === 'delta_rfdi' ? ['historias.leyenda.drfdi_menos', 'historias.leyenda.drfdi_mas'] : undefined} />
      <SelloOrigen origen={capa.origen} />
    </figure>
  )
}

/** El visor fijo de la historia: compara dos capas (fechas o polarizaciones) o muestra una sola. */
export function VisorPaso({ queVes, modo, a, b, etiquetaA, etiquetaB, titulo, controles }: Props) {
  const { t } = useT()
  let cuerpo: ReactNode
  const fallo = a.isError ? a : modo === 'par' && b.isError ? b : null
  if (modo === null) cuerpo = <p className="historia__nota">{t('historias.comparador.sin_pasadas')}</p>
  else if (fallo) cuerpo = <ErrorBloque mensaje={mensajeDeError(fallo.error, t)} onReintentar={() => void fallo.refetch()} />
  else if (modo === 'sola' && a.data) cuerpo = <CapaSola capa={a.data} etiqueta={etiquetaA} titulo={titulo} />
  else if (modo === 'par' && a.data && b.data) {
    const estilo = estiloDeCapa(a.data)
    cuerpo = (
      <Comparador
        antes={a.data.rejilla} despues={b.data.rejilla} rampa={estilo.rampa} categorias={estilo.categorias}
        etiquetaAntes={etiquetaA} etiquetaDespues={etiquetaB} titulo={titulo}
        origen={a.data.origen} origenDespues={b.data.origen} unidad={a.data.unidad} variable={a.data.variable} leyenda={a.data.leyenda}
      />
    )
  } else cuerpo = <Cargando texto={t('historias.comparador.calculando')} filas={5} />

  return (
    <section className="visor" aria-label={t('historias.vista.etiqueta')}>
      <p className="visor__que-ves"><span className="visor__rotulo">{t('historias.vista.etiqueta')}:</span> {queVes}</p>
      {cuerpo}
      {controles}
    </section>
  )
}

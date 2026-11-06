import { useEffect, useMemo, useRef } from 'react'
import type { CapaDto } from '../../api/consultas'
import { decodificarRejilla } from '../../api/rejilla'
import { Leyenda } from '../../diseno/Leyenda'
import { colorear } from '../../diseno/rampas'
import { SelloOrigen } from '../../diseno/SelloOrigen'
import { TextoApi } from '../../idioma/TextoApi'
import { useT } from '../../idioma/useT'
import { estiloDeCapa } from '../observatorio/derivados'

/** Un panel del radar simulado: la rejilla de la API con su rampa, leyenda y sello de origen. */
export function PanelRadar({ capa, titulo }: { capa: CapaDto; titulo: string }) {
  const { textoApi } = useT()
  const lienzo = useRef<HTMLCanvasElement>(null)
  const estilo = useMemo(() => estiloDeCapa(capa), [capa])
  const px = useMemo(() => colorear(decodificarRejilla(capa.rejilla), estilo.rampa, estilo.categorias, capa.rejilla.columnas), [capa, estilo])
  useEffect(() => {
    const c = lienzo.current
    if (!c) return
    c.width = px.width
    c.height = px.height
    c.getContext('2d')?.putImageData(px, 0, 0)
  }, [px])
  return (
    <figure className="panel-radar">
      <figcaption className="panel-radar__titulo"><TextoApi texto={titulo} /></figcaption>
      <canvas ref={lienzo} className="panel-radar__lienzo" role="img" aria-label={titulo} lang={textoApi(titulo).traducido ? undefined : 'es'} />
      <Leyenda paleta={capa.paleta} vmin={capa.rejilla.vmin} vmax={capa.rejilla.vmax} unidad={capa.unidad} leyenda={capa.leyenda} variable={capa.variable} />
      <SelloOrigen origen={capa.origen} />
    </figure>
  )
}

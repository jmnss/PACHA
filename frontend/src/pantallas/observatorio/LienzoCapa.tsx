import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import type { CapaDto } from '../../api/consultas'
import { decodificarRejilla } from '../../api/rejilla'
import { normalizar, ordenarCuadrante, UMBRAL_ARRASTRE } from '../../comparador/pintar'
import type { Cuadrante, Punto } from '../../comparador/Comparador'
import { Leyenda } from '../../diseno/Leyenda'
import { colorear } from '../../diseno/rampas'
import { useT } from '../../idioma/useT'
import { SelloOrigen } from '../../diseno/SelloOrigen'
import { estiloDeCapa } from './derivados'

interface Props {
  capa: CapaDto
  titulo: string
  onPunto: (p: Punto) => void
  onCuadrante: (c: Cuadrante) => void
  punto: Punto | null
  cuadrante: Cuadrante | null
}

/** Una sola capa (cambio, clasificación…) con los mismos gestos que el comparador: clic = punto, arrastre = cuadrante. */
export function LienzoCapa({ capa, titulo, onPunto, onCuadrante, punto, cuadrante }: Props) {
  const { t } = useT()
  const lienzo = useRef<HTMLCanvasElement>(null)
  const escenario = useRef<HTMLDivElement>(null)
  const gesto = useRef<{ inicio: Punto; arrastre: boolean } | null>(null)
  const [elastico, setElastico] = useState<Cuadrante | null>(null)
  const estilo = useMemo(() => estiloDeCapa(capa), [capa])
  const { rejilla } = capa

  const imagen = useMemo(() => {
    try { return { px: colorear(decodificarRejilla(rejilla), estilo.rampa, estilo.categorias, rejilla.columnas), error: null as string | null } } catch (e) {
      return { px: null, error: e instanceof Error ? e.message : t('obs.comparar.error_lienzo') }
    }
  }, [rejilla, estilo, t])
  useEffect(() => {
    const c = lienzo.current
    if (!c || !imagen.px) return
    c.width = imagen.px.width
    c.height = imagen.px.height
    c.getContext('2d')?.putImageData(imagen.px, 0, 0)
  }, [imagen])

  const rect = () => escenario.current!.getBoundingClientRect()
  const bajar = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !e.isPrimary) return
    gesto.current = { inicio: normalizar(e.clientX, e.clientY, rect()), arrastre: false }
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* sin captura */ }
  }
  const mover = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesto.current
    if (!g) return
    const p = normalizar(e.clientX, e.clientY, rect())
    if (Math.abs(p[0] - g.inicio[0]) > UMBRAL_ARRASTRE || Math.abs(p[1] - g.inicio[1]) > UMBRAL_ARRASTRE) g.arrastre = true
    if (g.arrastre) setElastico(ordenarCuadrante(g.inicio, p))
  }
  const soltar = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesto.current
    gesto.current = null
    setElastico(null)
    if (!g) return
    const fin = normalizar(e.clientX, e.clientY, rect())
    const arrastre = g.arrastre || Math.abs(fin[0] - g.inicio[0]) > UMBRAL_ARRASTRE || Math.abs(fin[1] - g.inicio[1]) > UMBRAL_ARRASTRE
    if (arrastre) onCuadrante(ordenarCuadrante(g.inicio, fin))
    else onPunto(fin)
  }
  const caja = elastico ?? cuadrante
  const marco = (c: Cuadrante) => ({ left: `${c[0] * 100}%`, top: `${c[1] * 100}%`, width: `${(c[2] - c[0]) * 100}%`, height: `${(c[3] - c[1]) * 100}%` })

  return (
    <figure className="comparador">
      <figcaption className="comparador__titulo">{titulo}</figcaption>
      {imagen.error ? (
        <p className="comparador__aviso" role="alert">{imagen.error}</p>
      ) : (
        <div className="comparador__escenario" ref={escenario} style={{ aspectRatio: `${rejilla.columnas} / ${rejilla.filas}`, '--razon': rejilla.columnas / rejilla.filas } as CSSProperties}>
          <canvas ref={lienzo} className="comparador__lienzo" role="img" aria-label={titulo} />
          <div className="comparador__gesto" data-testid="lienzo-gesto"
            onPointerDown={bajar} onPointerMove={mover} onPointerUp={soltar} onPointerCancel={() => { gesto.current = null; setElastico(null) }} />
          {caja && <div className="comparador__cuadrante" style={marco(caja)} data-testid="comparador-cuadrante" />}
          {punto && <div className="comparador__cruz" style={{ left: `${punto[0] * 100}%`, top: `${punto[1] * 100}%` }} data-testid="comparador-punto" aria-hidden="true" />}
        </div>
      )}
      <Leyenda paleta={capa.paleta} vmin={rejilla.vmin} vmax={rejilla.vmax} unidad={capa.unidad} leyenda={capa.leyenda} variable={capa.variable} />
      <SelloOrigen origen={capa.origen} />
    </figure>
  )
}

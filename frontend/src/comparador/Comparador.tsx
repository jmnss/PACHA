import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'
import type { ReactNode } from 'react'
import type { Rejilla } from '../api/rejilla'
import { useT } from '../idioma/useT'
import { Leyenda } from '../diseno/Leyenda'
import { SelloOrigen } from '../diseno/SelloOrigen'
import { resumenLienzo } from '../diseno/resumenLienzo'
import { textoSello, type Origen } from '../diseno/origen'
import type { ColorCategoria, NombreRampa, PaletaContrato } from '../diseno/rampas'
import { normalizar, ordenarCuadrante, pintarPar, UMBRAL_ARRASTRE } from './pintar'

export type Punto = [number, number]
export type Cuadrante = [number, number, number, number]

interface Props {
  antes: Rejilla
  despues: Rejilla
  rampa: NombreRampa
  etiquetaAntes: string
  etiquetaDespues: string
  /** Variable y polarización activa, p. ej. «σ⁰ HH, dB». */
  titulo?: ReactNode
  /** Colores de las categorías; si se da, la capa es categórica (códigos directos). */
  categorias?: readonly ColorCategoria[]
  onPunto?: (p: Punto) => void
  onCuadrante?: (c: Cuadrante) => void
  /** Punto y cuadrante marcados (normalizados 0–1, y = 0 al norte). */
  punto?: Punto | null
  cuadrante?: Cuadrante | null
  origen: Origen
  /** Origen de la imagen «después» si difiere del de «antes»; entonces se muestran ambos sellos. */
  origenDespues?: Origen
  unidad?: string
  /** Nombre de la variable de la capa (elige la rampa y las categorías de la leyenda). */
  variable?: string
  leyenda?: [string, string][] | null
}

const VARIABLE_DE_RAMPA: Partial<Record<NombreRampa, string>> = { fuego: 'quemado', mmi: 'mmi', lahar: 'lahar', ceniza: 'ceniza' }

function paletaDeRampa(rampa: NombreRampa, categorias: boolean): PaletaContrato {
  if (categorias) return 'categorias'
  if (rampa === 'gris' || rampa === 'divergente' || rampa === 'ciclico') return rampa
  return 'secuencial'
}

function pintarEn(lienzo: HTMLCanvasElement | null, px: ImageData) {
  if (!lienzo) return
  lienzo.width = px.width
  lienzo.height = px.height
  lienzo.getContext('2d')?.putImageData(px, 0, 0)
}

function capturar(el: Element, id: number) {
  try { el.setPointerCapture(id) } catch { /* sin captura: el gesto sigue mientras el puntero esté encima */ }
}

/** Dos imágenes de la misma extensión con un divisor deslizante; clic = punto, arrastre = cuadrante. */
export function Comparador({
  antes, despues, rampa, etiquetaAntes, etiquetaDespues, titulo, categorias, onPunto, onCuadrante,
  punto, cuadrante, origen, origenDespues, unidad, variable, leyenda,
}: Props) {
  const { t, formatoNumero } = useT()
  const idResumen = useId()
  const unidadVista = unidad ?? t('piezas.comparador.unidad_valor')
  const [pos, setPos] = useState(50)
  const escenario = useRef<HTMLDivElement>(null)
  const lienzoAntes = useRef<HTMLCanvasElement>(null)
  const lienzoDespues = useRef<HTMLCanvasElement>(null)
  const divisor = useRef<{ activo: boolean }>({ activo: false })
  const gesto = useRef<{ inicio: Punto; actual: Punto; arrastre: boolean } | null>(null)
  const [elastico, setElastico] = useState<Cuadrante | null>(null)

  const mismaExtension = antes.filas === despues.filas && antes.columnas === despues.columnas
    && antes.bbox.every((v, i) => Math.abs(v - despues.bbox[i]) < 1e-9)

  const par = useMemo(() => {
    if (!mismaExtension) return null
    try { return { ...pintarPar(antes, despues, rampa, categorias, t), error: null as string | null } } catch (e) {
      return { error: e instanceof Error ? e.message : t('piezas.comparador.error_dibujo') }
    }
  }, [antes, despues, rampa, categorias, mismaExtension, t])

  useEffect(() => {
    if (par && 'antes' in par) { pintarEn(lienzoAntes.current, par.antes); pintarEn(lienzoDespues.current, par.despues) }
  }, [par])

  const rect = () => escenario.current!.getBoundingClientRect()

  // ---- divisor ----
  const mover = (cx: number) => {
    const r = rect()
    if (r.width > 0) setPos(Math.min(100, Math.max(0, ((cx - r.left) / r.width) * 100)))
  }
  const alBajarDivisor = (e: PointerEvent<HTMLDivElement>) => {
    divisor.current.activo = true
    capturar(e.currentTarget, e.pointerId)
    mover(e.clientX)
    e.preventDefault()
  }
  const alMoverDivisor = (e: PointerEvent<HTMLDivElement>) => { if (divisor.current.activo) mover(e.clientX) }
  const alSoltarDivisor = () => { divisor.current.activo = false }
  const alTeclear = (e: KeyboardEvent<HTMLDivElement>) => {
    const paso = e.shiftKey ? 10 : 1
    let nuevo: number | null = null
    if (e.key === 'ArrowLeft') nuevo = pos - paso
    else if (e.key === 'ArrowRight') nuevo = pos + paso
    else if (e.key === 'Home') nuevo = 0
    else if (e.key === 'End') nuevo = 100
    if (nuevo === null) return
    e.preventDefault()
    setPos(Math.min(100, Math.max(0, nuevo)))
  }

  // ---- gesto sobre la imagen: punto o cuadrante ----
  const alBajarImagen = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !e.isPrimary) return
    const p = normalizar(e.clientX, e.clientY, rect())
    gesto.current = { inicio: p, actual: p, arrastre: false }
    capturar(e.currentTarget, e.pointerId)
  }
  const alMoverImagen = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesto.current
    if (!g) return
    g.actual = normalizar(e.clientX, e.clientY, rect())
    if (Math.abs(g.actual[0] - g.inicio[0]) > UMBRAL_ARRASTRE || Math.abs(g.actual[1] - g.inicio[1]) > UMBRAL_ARRASTRE) g.arrastre = true
    if (g.arrastre) setElastico(ordenarCuadrante(g.inicio, g.actual))
  }
  const alSoltarImagen = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesto.current
    gesto.current = null
    setElastico(null)
    if (!g) return
    const fin = normalizar(e.clientX, e.clientY, rect())
    const arrastre = g.arrastre || Math.abs(fin[0] - g.inicio[0]) > UMBRAL_ARRASTRE || Math.abs(fin[1] - g.inicio[1]) > UMBRAL_ARRASTRE
    if (arrastre) onCuadrante?.(ordenarCuadrante(g.inicio, fin))
    else onPunto?.(fin)
  }
  const alCancelarImagen = () => { gesto.current = null; setElastico(null) }

  const caja = elastico ?? cuadrante ?? null
  const estilo = (c: Cuadrante) => ({ left: `${c[0] * 100}%`, top: `${c[1] * 100}%`, width: `${(c[2] - c[0]) * 100}%`, height: `${(c[3] - c[1]) * 100}%` })
  const rangoOk = par && 'antes' in par ? par : null
  const vmin = rangoOk?.vmin ?? antes.vmin
  const vmax = rangoOk?.vmax ?? antes.vmax

  return (
    <figure className="comparador">
      {titulo && <figcaption className="comparador__titulo">{titulo}</figcaption>}
      {!mismaExtension ? (
        <p className="comparador__aviso" role="alert">{t('piezas.comparador.sin_misma_zona')}</p>
      ) : par && par.error ? (
        <p className="comparador__aviso" role="alert">{par.error}</p>
      ) : (
        <div className="comparador__escenario" ref={escenario}
          style={{ aspectRatio: `${antes.columnas} / ${antes.filas}`, '--razon': antes.columnas / antes.filas } as CSSProperties}>
          <canvas ref={lienzoAntes} className="comparador__lienzo" role="img" aria-label={etiquetaAntes} aria-describedby={`${idResumen}-antes`} />
          <p id={`${idResumen}-antes`} className="solo-lectores">
            {resumenLienzo(etiquetaAntes, { rejilla: antes, origen, unidad: unidadVista, categorica: !!categorias }, t, formatoNumero)}
          </p>
          <p id={`${idResumen}-despues`} className="solo-lectores">
            {resumenLienzo(etiquetaDespues, { rejilla: despues, origen: origenDespues ?? origen, unidad: unidadVista, categorica: !!categorias }, t, formatoNumero)}
          </p>
          <canvas ref={lienzoDespues} className="comparador__lienzo comparador__lienzo--despues" role="img" aria-label={etiquetaDespues} aria-describedby={`${idResumen}-despues`}
            style={{ clipPath: `inset(0 0 0 ${pos}%)` }} />
          <div className="comparador__gesto" data-testid="comparador-gesto"
            onPointerDown={alBajarImagen} onPointerMove={alMoverImagen} onPointerUp={alSoltarImagen} onPointerCancel={alCancelarImagen} />
          {caja && <div className="comparador__cuadrante" style={estilo(caja)} data-testid="comparador-cuadrante" />}
          {punto && (
            <div className="comparador__cruz" style={{ left: `${punto[0] * 100}%`, top: `${punto[1] * 100}%` }} data-testid="comparador-punto" aria-hidden="true" />
          )}
          <span className="comparador__fecha comparador__fecha--antes">{etiquetaAntes}</span>
          <span className="comparador__fecha comparador__fecha--despues">{etiquetaDespues}</span>
          <div className="comparador__divisor" style={{ left: `${pos}%` }} role="slider" tabIndex={0}
            aria-label={t('piezas.comparador.divisor')} aria-orientation="horizontal"
            aria-valuemin={0} aria-valuemax={100} aria-valuenow={pos} aria-valuetext={t('piezas.comparador.divisor_valor', { n: Math.round(pos) })}
            onKeyDown={alTeclear} onPointerDown={alBajarDivisor} onPointerMove={alMoverDivisor}
            onPointerUp={alSoltarDivisor} onPointerCancel={alSoltarDivisor}>
            <span className="comparador__linea" aria-hidden="true" />
            <span className="comparador__tirador" aria-hidden="true" />
          </div>
        </div>
      )}
      {rangoOk?.aviso && <p className="comparador__nota">{rangoOk.aviso}</p>}
      <Leyenda paleta={paletaDeRampa(rampa, !!categorias)} vmin={vmin} vmax={vmax} unidad={unidadVista}
        variable={variable ?? VARIABLE_DE_RAMPA[rampa]} leyenda={leyenda} />
      <SelloOrigen origen={origen} />
      {origenDespues && textoSello(origenDespues, t) !== textoSello(origen, t) && (
        <SelloOrigen origen={origenDespues} />
      )}
    </figure>
  )
}

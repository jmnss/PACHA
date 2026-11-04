import { useRef, type KeyboardEvent, type PointerEvent } from 'react'
import type { components } from '../api/tipos'

type Adquisicion = components['schemas']['Adquisicion']

export interface Temporada {
  inicio: string
  fin: string
  tipo: 'lluviosa' | 'seca'
}

interface Props {
  adquisiciones: Pick<Adquisicion, 'id' | 'instante'>[]
  /** Instante ISO del evento (marca blanca), si lo hay. */
  evento?: string
  /** Instante ISO actual; fuera de rango se recorta. */
  instante: string
  temporadas?: Temporada[]
  /** Recibe el instante ISO (al minuto más cercano) y el índice de la pasada más próxima. */
  onCambio: (instante: string, indiceMasCercano: number) => void
}

const MIN = 60_000
const fmt = new Intl.DateTimeFormat('es-EC', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const fmtHora = new Intl.DateTimeFormat('es-EC', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })

/** Índice de la pasada más cercana a t (ms). */
function masCercano(ts: number[], t: number): number {
  let mejor = 0
  for (let i = 1; i < ts.length; i++) if (Math.abs(ts[i] - t) < Math.abs(ts[mejor] - t)) mejor = i
  return mejor
}

/**
 * Cinta de pasadas (docs/diseno.md §2 y §8): una muesca de 1 px por adquisición, el evento en blanco,
 * el cursor y la pasada activa en --accent, y una banda tenue para la temporada lluviosa.
 * Clic o arrastre = instante al minuto más cercano (no solo a la muesca).
 */
export function CintaPasadas({ adquisiciones, evento, instante, temporadas = [], onCambio }: Props) {
  const pista = useRef<HTMLDivElement>(null)
  const arrastrando = useRef(false)
  const ts = adquisiciones.map((a) => Date.parse(a.instante))
  if (ts.length === 0) return <div className="cinta cinta--vacia">Sin pasadas disponibles.</div>

  const t0 = Math.min(...ts)
  const t1 = Math.max(...ts)
  const span = t1 - t0
  const pct = (t: number) => (span === 0 ? 0 : ((Math.min(t1, Math.max(t0, t)) - t0) / span) * 100)
  const actual = Math.min(t1, Math.max(t0, Number.isFinite(Date.parse(instante)) ? Date.parse(instante) : t0))
  const iActivo = masCercano(ts, actual)
  const tEvento = evento ? Date.parse(evento) : NaN
  const hayEvento = Number.isFinite(tEvento) && tEvento >= t0 && tEvento <= t1

  const emitir = (t: number) => {
    const minutos = Math.round(Math.min(t1, Math.max(t0, t)) / MIN) * MIN
    onCambio(new Date(minutos).toISOString(), masCercano(ts, minutos))
  }
  const desdeX = (clientX: number) => {
    const r = pista.current?.getBoundingClientRect()
    if (!r || r.width === 0) return
    emitir(t0 + Math.min(1, Math.max(0, (clientX - r.left) / r.width)) * span)
  }
  const alPulsar = (e: PointerEvent) => {
    if (e.button !== 0) return
    arrastrando.current = true
    try { e.currentTarget.setPointerCapture?.(e.pointerId) } catch { /* sin captura */ }
    desdeX(e.clientX)
  }
  const alMover = (e: PointerEvent) => {
    if (!arrastrando.current) return
    if (e.buttons === 0) { arrastrando.current = false; return }
    desdeX(e.clientX)
  }
  const alSoltar = () => { arrastrando.current = false }

  const irAPasada = (i: number) => {
    const j = Math.min(ts.length - 1, Math.max(0, i))
    onCambio(new Date(ts[j]).toISOString(), j)
  }
  const alTeclear = (e: KeyboardEvent) => {
    const mapa: Record<string, number> = {
      ArrowRight: iActivo + 1, ArrowUp: iActivo + 1, ArrowLeft: iActivo - 1, ArrowDown: iActivo - 1, Home: 0, End: ts.length - 1,
    }
    if (e.key in mapa) { e.preventDefault(); irAPasada(mapa[e.key]) }
  }

  const textoValor = `Pasada ${iActivo + 1} de ${ts.length}, ${fmtHora.format(actual)} UTC`

  return (
    <div className="cinta">
      <div
        ref={pista}
        className="cinta__pista"
        role="slider"
        tabIndex={0}
        aria-label="Instante de la cinta de pasadas"
        aria-orientation="horizontal"
        aria-valuemin={0}
        aria-valuemax={ts.length - 1}
        aria-valuenow={iActivo}
        aria-valuetext={textoValor}
        onKeyDown={alTeclear}
        onPointerDown={alPulsar}
        onPointerMove={alMover}
        onPointerUp={alSoltar}
        onPointerCancel={alSoltar}
        data-testid="cinta-pista"
      >
        {temporadas.filter((s) => s.tipo === 'lluviosa').map((s, i) => {
          const a = Date.parse(s.inicio), b = Date.parse(s.fin)
          if (!(b > t0 && a < t1)) return null
          return (
            <span key={i} className="cinta__temporada" title="Temporada lluviosa"
              style={{ left: `${pct(a)}%`, width: `${pct(b) - pct(a)}%` }} />
          )
        })}
        {ts.map((t, i) => (
          <span key={adquisiciones[i].id + i} className={`cinta__muesca${i === iActivo ? ' cinta__muesca--activa' : ''}`}
            style={{ left: `${pct(t)}%` }} />
        ))}
        {hayEvento && <span className="cinta__evento" style={{ left: `${pct(tEvento)}%` }} data-testid="cinta-evento" />}
        <span className="cinta__cursor" style={{ left: `${pct(actual)}%` }} data-testid="cinta-cursor" />
      </div>
      <div className="cinta__fechas">
        <span>{fmt.format(t0)}</span>
        <span>{fmt.format(t1)}</span>
      </div>
      {hayEvento && (
        <div className="cinta__fechas cinta__fechas--evento">
          <span>Evento: {fmt.format(tEvento)}</span>
          {temporadas.some((s) => s.tipo === 'lluviosa') && <span className="cinta__leyenda-banda">Franja tenue: temporada lluviosa</span>}
        </div>
      )}
    </div>
  )
}

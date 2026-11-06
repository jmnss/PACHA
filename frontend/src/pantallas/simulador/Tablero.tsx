import type { KeyboardEvent, MouseEvent } from 'react'
import type { EventoDto, MundoDto } from '../../api/simulador'
import { useT } from '../../idioma/useT'
import { celdaDesdePunto, type Celda } from './geometria'

interface Props {
  mundo: MundoDto
  evento?: EventoDto
  /** Cuadro de la animación que se muestra. */
  indice: number
  cursor: Celda | null
  onCelda: (i: number, j: number) => void
  onCursor: (c: Celda) => void
}

const FLECHAS: Record<string, Celda> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }

/** Relieve + cuadro de la animación + marcas. Clic o teclado (flechas, Mayús ×10, Enter) para desatar el evento. */
export function Tablero({ mundo, evento, indice, cursor, onCelda, onCursor }: Props) {
  const { t } = useT()
  const n = mundo.n
  const cuadro = evento?.cuadros_png_b64[Math.min(indice, (evento?.cuadros_png_b64.length ?? 1) - 1)]
  const pct = (v: number) => `${(100 * v).toFixed(3)}%`

  const alClic = (e: MouseEvent<HTMLDivElement>) => {
    const [i, j] = celdaDesdePunto(e.currentTarget.getBoundingClientRect(), n, e.clientX, e.clientY)
    onCursor([i, j])
    onCelda(i, j)
  }
  const alTeclado = (e: KeyboardEvent<HTMLDivElement>) => {
    const paso = FLECHAS[e.key]
    if (paso) {
      e.preventDefault()
      const k = e.shiftKey ? 10 : 1
      if (!cursor) { onCursor([Math.floor(n / 2), Math.floor(n / 2)]); return }
      const lim = (v: number) => Math.min(n - 1, Math.max(0, v))
      onCursor([lim(cursor[0] + paso[0] * k), lim(cursor[1] + paso[1] * k)])
    } else if ((e.key === 'Enter' || e.key === ' ') && cursor) {
      e.preventDefault()
      onCelda(cursor[0], cursor[1])
    }
  }

  return (
    <div
      className="tablero" role="group" tabIndex={0} onClick={alClic} onKeyDown={alTeclado}
      aria-label={t('sim.tablero.aria')}
    >
      <img className="tablero__capa" alt="" src={`data:image/png;base64,${mundo.relieve_png_b64}`} draggable={false} />
      {cuadro && <img className="tablero__capa tablero__capa--evento" alt="" src={`data:image/png;base64,${cuadro}`} draggable={false} />}
      {mundo.marcas.map((m) => (
        <span key={`${m.tipo}-${m.texto}`} className={`tablero__marca tablero__marca--${m.tipo}`} style={{ left: pct(m.x), top: pct(m.y) }}>
          {m.tipo === 'volcan' && <span aria-hidden="true">▲ </span>}{m.texto}
        </span>
      ))}
      {evento && (
        <span className="tablero__evento" style={{ left: pct((evento.celda[1] + 0.5) / n), top: pct((evento.celda[0] + 0.5) / n) }} aria-hidden="true" />
      )}
      {cursor && (
        <span className="tablero__cursor" style={{ left: pct(cursor[1] / n), top: pct(cursor[0] / n), width: pct(1 / n), height: pct(1 / n) }} aria-hidden="true" />
      )}
    </div>
  )
}

import type { ResultadoCambio } from '../../api/consultas'
import { SelloOrigen } from '../../diseno/SelloOrigen'
import { Tarjeta } from '../../diseno/Tarjeta'
import { formatoNumero } from '../../graficos/formato'
import { valorRedondo } from './flujo'

type Vectores = NonNullable<ResultadoCambio['vectores']>

const decimalesDe = (v: number) => (v >= 10 ? 0 : v >= 1 ? 1 : v >= 0.1 ? 2 : 3)

/** Campo de flujo: una flecha por celda, escalada a la velocidad (arriba = norte). Cada flecha mide `escala` km por unidad de velocidad. */
export function CampoFlujo({ vectores }: { vectores: Vectores }) {
  const n = vectores.x.length
  const mag = vectores.u.map((u, i) => Math.hypot(u, vectores.v[i]))
  const maxMag = Math.max(0, ...mag)
  const mitadX = Math.max(1e-6, ...vectores.x.map(Math.abs))
  const mitadY = Math.max(1e-6, ...vectores.y.map(Math.abs))
  const paso = Math.sqrt((4 * mitadX * mitadY) / Math.max(1, n))
  const escala = maxMag > 0 ? (0.85 * paso) / maxMag : 0
  const cabeza = 0.22 * paso
  const margen = paso
  const ancho = 2 * mitadX + 2 * margen
  const alto = 2 * mitadY + 2 * margen
  const ref = valorRedondo(maxMag)
  const unidad = vectores.unidad
  const d = decimalesDe(maxMag)

  const flecha = (i: number) => {
    const x0 = vectores.x[i]
    const y0 = -vectores.y[i]
    const x1 = x0 + vectores.u[i] * escala
    const y1 = y0 - vectores.v[i] * escala
    const l = Math.hypot(x1 - x0, y1 - y0)
    if (l < 1e-9) return null
    const ux = (x1 - x0) / l
    const uy = (y1 - y0) / l
    const h = Math.min(cabeza, l * 0.6)
    const punta = `${x1},${y1} ${x1 - ux * h - uy * h * 0.45},${y1 - uy * h + ux * h * 0.45} ${x1 - ux * h + uy * h * 0.45},${y1 - uy * h - ux * h * 0.45}`
    return (
      <g key={i} className="campo-flujo__flecha" strokeWidth={cabeza * 0.28}>
        <line x1={x0} y1={y0} x2={x1 - ux * h * 0.5} y2={y1 - uy * h * 0.5} />
        <polygon points={punta} />
      </g>
    )
  }

  return (
    <Tarjeta titulo="Campo de flujo" pie={<SelloOrigen origen={vectores.origen} />}>
      <div className="campo-flujo">
        <svg className="campo-flujo__lienzo" viewBox={`${-mitadX - margen} ${-mitadY - margen} ${ancho} ${alto}`}
          role="img" aria-label={`Campo de flujo: ${n} flechas; la mayor corresponde a ${formatoNumero(maxMag, d)} ${unidad}. Arriba es el norte.`}>
          {vectores.u.map((_, i) => flecha(i))}
        </svg>
        {maxMag > 0 ? (
          <div className="campo-flujo__ref" aria-hidden="true">
            <svg viewBox={`0 0 ${ancho} ${cabeza * 2}`} style={{ width: `${((ref * escala) / ancho) * 100}%` }} preserveAspectRatio="xMinYMid meet">
              <g className="campo-flujo__flecha" strokeWidth={cabeza * 0.28}>
                <line x1={0} y1={cabeza} x2={ref * escala - cabeza * 0.5} y2={cabeza} />
                <polygon points={`${ref * escala},${cabeza} ${ref * escala - cabeza},${cabeza - cabeza * 0.45} ${ref * escala - cabeza},${cabeza + cabeza * 0.45}`} />
              </g>
            </svg>
            <span className="campo-flujo__valor num">{formatoNumero(ref, decimalesDe(ref))} {unidad}</span>
          </div>
        ) : (
          <p className="campo-flujo__nota">Sin movimiento apreciable entre las dos pasadas.</p>
        )}
        <p className="campo-flujo__nota">Arriba es el norte. Cada flecha apunta hacia donde se mueve el hielo en esa celda; su largo es proporcional a la velocidad.</p>
      </div>
    </Tarjeta>
  )
}

import { SelloOrigen } from '../diseno/SelloOrigen'
import { textoSello, type Origen } from '../diseno/origen'
import { ANCHO_CARACTER, escalaRedonda } from './escala'
import { formatoNumero, useAncho } from './useAncho'

export interface BarraDato {
  etiqueta: string
  valor: number
}
interface Props {
  datos: BarraDato[]
  unidad: string
  origen: Origen
  titulo?: string
  alto?: number
}

const M_DER = 12
const M_INF = 28
const M_SUP = 20

function recortar(t: string, ancho: number): string {
  const max = Math.max(1, Math.floor(ancho / ANCHO_CARACTER))
  return t.length <= max ? t : max <= 1 ? '…' : t.slice(0, max - 1).trimEnd() + '…'
}

/** Barras planas de un solo tono sobre escala redonda, con el valor rotulado y el sello de origen. */
export function Barras({ datos, unidad, origen, titulo, alto = 220 }: Props) {
  const { ref, ancho } = useAncho()
  const valores = datos.map((d) => d.valor).filter(Number.isFinite)
  const escala = escalaRedonda(Math.min(0, ...valores), Math.max(0, ...valores), 5)
  const vmin = escala.ticks[0]
  const vmax = escala.tope
  const mIzq = Math.ceil(Math.max(...escala.ticks.map((v) => formatoNumero(v).length)) * ANCHO_CARACTER) + 12
  const x0 = mIzq
  const x1 = Math.max(x0 + 40, ancho - M_DER)
  const y0 = M_SUP
  const y1 = alto - M_INF
  const py = (v: number) => y1 - ((v - vmin) / (vmax - vmin)) * (y1 - y0)
  const slot = datos.length ? (x1 - x0) / datos.length : 0
  const grosor = Math.min(48, slot * 0.6)
  const resumen = datos.length
    ? `${titulo ?? 'Barras'}: ${datos.map((d) => `${d.etiqueta} ${formatoNumero(d.valor)}`).join(', ')} ${unidad}. ${textoSello(origen)}`
    : `${titulo ?? 'Barras'}: sin datos. ${textoSello(origen)}`
  return (
    <figure className="grafico">
      <div className="grafico__cabecera">
        <span className="grafico__unidad">{unidad}</span>
      </div>
      <div ref={ref} className="grafico__lienzo">
        <svg width={ancho} height={alto} viewBox={`0 0 ${ancho} ${alto}`} role="img" aria-label={resumen} className="grafico__svg">
          {escala.ticks.map((v) => (
            <g key={v}>
              <line className="grafico__rejilla" x1={x0} x2={x1} y1={py(v)} y2={py(v)} />
              <text className="grafico__eje" x={x0 - 8} y={py(v)} textAnchor="end" dominantBaseline="middle">
                {formatoNumero(v)}
              </text>
            </g>
          ))}
          {datos.map((d, i) => {
            const cx = x0 + slot * (i + 0.5)
            const yv = py(d.valor)
            const y = Math.min(yv, py(0))
            return (
              <g key={`${d.etiqueta}-${i}`}>
                <rect className="grafico__barra" x={cx - grosor / 2} y={y} width={grosor} height={Math.max(1, Math.abs(py(0) - yv))} />
                <text className="grafico__eje grafico__eje--valor" x={cx} y={(d.valor >= 0 ? y : Math.max(yv, py(0))) + (d.valor >= 0 ? -6 : 14)} textAnchor="middle">
                  {formatoNumero(d.valor)}
                </text>
                <text className="grafico__eje" x={cx} y={y1 + 18} textAnchor="middle">
                  {recortar(d.etiqueta, slot - 4)}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
      <figcaption className="grafico__pie">
        <SelloOrigen origen={origen} />
      </figcaption>
    </figure>
  )
}

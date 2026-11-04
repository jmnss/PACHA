import { SelloOrigen } from '../diseno/SelloOrigen'
import type { Origen } from '../diseno/origen'
import { esReal, textoSello } from '../diseno/origen'
import { colocarEtiquetas, escalaRedonda } from './escala'
import { esVerdad, fechaEje, parseInstante, rotulo } from './fechas'
import { formatoNumero } from './formato'
import { ANCHO_CARACTER, ANCHO_MIN_PLANO, FILA, GUARDA_EJE, M_DER, M_INF, M_SUP_BASE } from './geometria'
import { useAncho } from './useAncho'

export interface SerieLinea {
  nombre: string
  /** [instante ISO, valor]; un valor nulo o no finito interrumpe la línea. */
  puntos: [string, number | null][]
}
export interface MarcaLinea {
  instante: string
  etiqueta: string
  tipo?: 'evento' | 'antes' | 'despues'
}
interface Props {
  series: SerieLinea[]
  marcas?: MarcaLinea[]
  unidad: string
  origen: Origen
  titulo?: string
  alto?: number
}

const DIA = 86_400_000

/** Gráfico de líneas rectas de 2 px (docs/diseno.md §8). Siempre lleva el sello de origen. */
export function Linea({ series, marcas = [], unidad, origen, titulo, alto = 220 }: Props) {
  const { ref, ancho } = useAncho()
  const sint = !esReal(origen)
  const datos = series.map((s, i) => ({
    ...s,
    verdad: esVerdad(s.nombre, sint),
    pts: s.puntos
      .map(([t, v]) => ({ t: parseInstante(t), v }))
      .filter((p) => Number.isFinite(p.t))
      .sort((a, b) => a.t - b.t),
    indice: i,
  }))
  const principal = datos.find((s) => !s.verdad)
  const color = (s: (typeof datos)[number]) =>
    s.verdad ? 'var(--chart-2)' : s === principal ? 'var(--chart-1)' : 'var(--chart-3)'

  const valores = datos.flatMap((s) => s.pts.map((p) => p.v).filter((v): v is number => v !== null && Number.isFinite(v)))
  const tiempos = datos.flatMap((s) => s.pts.map((p) => p.t))
  const vacio = valores.length === 0
  const t0 = tiempos.length ? Math.min(...tiempos) : 0
  const t1 = tiempos.length ? Math.max(...tiempos) : 1
  const escala = vacio ? escalaRedonda(0, 1, 3) : escalaRedonda(Math.min(...valores), Math.max(...valores), 5)
  const dec = escala.decimales
  const vmin = escala.ticks[0]
  const vmax = escala.tope

  const anchoEtq = Math.max(...escala.ticks.map((v) => formatoNumero(v, dec).length)) * ANCHO_CARACTER
  const mIzq = Math.ceil(anchoEtq) + GUARDA_EJE
  const x0 = mIzq
  const x1 = Math.max(x0 + ANCHO_MIN_PLANO, ancho - M_DER)
  const px = (t: number) => (t1 === t0 ? (x0 + x1) / 2 : x0 + ((t - t0) / (t1 - t0)) * (x1 - x0))

  const todasMarcas = marcas.map((m) => ({ ...m, t: parseInstante(m.instante) })).filter((m) => Number.isFinite(m.t))
  const marcasVis = todasMarcas.filter((m) => m.t >= t0 && m.t <= t1).sort((a, b) => a.t - b.t)
  const marcasFuera = todasMarcas.filter((m) => m.t < t0 || m.t > t1)
  const colocadas = colocarEtiquetas(
    marcasVis.map((m) => ({ x: px(m.t), texto: m.etiqueta })),
    ancho,
  )
  const filasUsadas = colocadas.length ? Math.max(...colocadas.map((c) => c.fila)) + 1 : 0
  const mSup = M_SUP_BASE + filasUsadas * FILA
  const y0 = mSup
  const y1 = alto - M_INF
  const py = (v: number) => y1 - ((v - vmin) / (vmax - vmin)) * (y1 - y0)

  const conAnio = t1 - t0 > 330 * DIA
  const conHora = t1 - t0 < 2 * DIA
  const fmt = (t: number) => fechaEje(t, { conAnio, conHora })
  const nEtq = ancho < 420 ? 3 : 4
  const ticksX = t1 === t0 ? [t0] : Array.from({ length: nEtq }, (_, i) => t0 + ((t1 - t0) * i) / (nEtq - 1))

  const segmentos = (pts: { t: number; v: number | null }[]): string => {
    const partes: string[] = []
    let actual: string[] = []
    const cerrar = () => {
      if (actual.length === 1) {
        const [x, y] = actual[0].split(',').map(Number)
        partes.push(`M${x - 1},${y}L${x + 1},${y}`)
      } else if (actual.length > 1) partes.push('M' + actual.join('L'))
      actual = []
    }
    for (const p of pts) {
      if (p.v === null || !Number.isFinite(p.v)) cerrar()
      else actual.push(`${px(p.t).toFixed(1)},${py(p.v).toFixed(1)}`)
    }
    cerrar()
    return partes.join('')
  }

  const textoMarcas = marcasVis.length
    ? ` Marcas: ${marcasVis.map((m) => `${m.etiqueta} (${fechaEje(m.t, { conAnio: true, conHora })})`).join(', ')}.`
    : ''
  const textoFuera = marcasFuera.length
    ? ` Fuera del rango temporal: ${marcasFuera.map((m) => m.etiqueta).join(', ')}.`
    : ''
  const resumen = vacio
    ? `${titulo ?? 'Gráfico'}: sin datos en este rango.${textoMarcas}${textoFuera} ${textoSello(origen)}`
    : `${titulo ?? 'Gráfico'}: ${datos.map((s) => rotulo(s.nombre, sint)).join(', ')}; de ${formatoNumero(Math.min(...valores), dec)} a ${formatoNumero(Math.max(...valores), dec)} ${unidad}, del ${fechaEje(t0, { conAnio: true, conHora })} al ${fechaEje(t1, { conAnio: true, conHora })}.${textoMarcas}${textoFuera} ${textoSello(origen)}`

  return (
    <figure className="grafico">
      <div className="grafico__cabecera">
        <span className="grafico__unidad">{unidad}</span>
        {datos.length > 1 && (
          <ul className="grafico__leyenda">
            {datos.map((s) => (
              <li key={s.indice}>
                <span className="grafico__punto" style={{ background: color(s) }} aria-hidden="true" />
                {rotulo(s.nombre, sint)}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div ref={ref} className="grafico__lienzo">
        <svg width={ancho} height={alto} viewBox={`0 0 ${ancho} ${alto}`} role="img" aria-label={resumen} className="grafico__svg">
          {escala.ticks.map((v) => (
            <g key={v}>
              <line className="grafico__rejilla" x1={x0} x2={x1} y1={py(v)} y2={py(v)} />
              <text className="grafico__eje" x={x0 - 8} y={py(v)} textAnchor="end" dominantBaseline="middle">
                {formatoNumero(v, dec)}
              </text>
            </g>
          ))}
          {ticksX.map((t, i) => (
            <text
              key={t}
              className="grafico__eje"
              x={px(t)}
              y={y1 + 18}
              textAnchor={i === 0 && ticksX.length > 1 ? 'start' : i === ticksX.length - 1 && ticksX.length > 1 ? 'end' : 'middle'}
            >
              {fmt(t)}
            </text>
          ))}
          {marcasVis.map((m, i) => {
            const e = colocadas[i]
            const x = px(m.t)
            return (
              <g key={`${m.instante}-${i}`} className={`grafico__marca grafico__marca--${m.tipo ?? 'evento'}`}>
                <line x1={x} x2={x} y1={M_SUP_BASE + e.fila * FILA + 2} y2={y1} />
                {e.texto && (
                  <text x={x + (e.ancla === 'start' ? 3 : -3)} y={M_SUP_BASE + e.fila * FILA + 8} textAnchor={e.ancla}>
                    {e.texto}
                  </text>
                )}
              </g>
            )
          })}
          {vacio ? (
            <>
              <line className="grafico__cero" x1={x0} x2={x1} y1={py(0)} y2={py(0)} />
              <text className="grafico__vacio" x={(x0 + x1) / 2} y={(y0 + y1) / 2} textAnchor="middle">
                Sin datos en este rango
              </text>
            </>
          ) : (
            datos.map((s) => (
              <path
                key={s.indice}
                className={`grafico__linea${s.verdad ? ' grafico__linea--verdad' : ''}`}
                data-serie={rotulo(s.nombre, sint)}
                d={segmentos(s.pts)}
                stroke={color(s)}
                strokeDasharray={s.verdad ? '4 4' : undefined}
                fill="none"
              />
            ))
          )}
        </svg>
      </div>
      {marcasFuera.length > 0 && (
        <p className="grafico__nota">
          {marcasFuera.length === 1 ? 'Una marca queda' : `${marcasFuera.length} marcas quedan`} fuera del rango de fechas:{' '}
          {marcasFuera.map((m) => m.etiqueta).join(', ')}.
        </p>
      )}
      <figcaption className="grafico__pie">
        <SelloOrigen origen={origen} />
      </figcaption>
    </figure>
  )
}

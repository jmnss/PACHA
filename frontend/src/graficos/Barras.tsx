import { useT } from '../idioma/useT'
import { SelloOrigen } from '../diseno/SelloOrigen'
import { textoSello, type Origen } from '../diseno/origen'
import { escalaRedonda, recortar } from './escala'
import { formatoNumero } from './formato'
import { ANCHO_CARACTER, ANCHO_MIN_PLANO, GUARDA_EJE, M_DER, M_INF_BARRAS, M_SUP_BARRAS } from './geometria'
import { useAncho } from './useAncho'

export interface BarraDato {
  etiqueta: string
  valor: number
  /** Rótulo corto del eje (p. ej. la inicial); el resumen accesible usa `etiqueta`. */
  corta?: string
}
interface Props {
  datos: BarraDato[]
  unidad: string
  origen: Origen
  titulo?: string
  alto?: number
  /** Rotula cada barra con su valor (por defecto sí); apágalo si las barras son estrechas. */
  valores?: boolean
}

/** Barras planas de un solo tono sobre escala redonda, con el valor rotulado y el sello de origen. */
export function Barras({ datos: entrada, unidad, origen, titulo, alto = 220, valores: rotular = true }: Props) {
  const { t, idioma } = useT()
  const fmt = (v: number, d: number) => formatoNumero(v, d, idioma)
  const { ref, ancho } = useAncho()
  const datos = entrada.filter((d) => Number.isFinite(d.valor))
  const valores = datos.map((d) => d.valor)
  const escala = escalaRedonda(Math.min(0, ...valores), Math.max(0, ...valores), 5)
  const dec = escala.decimales
  const vmin = escala.ticks[0]
  const vmax = escala.tope
  const mIzq = Math.ceil(Math.max(...escala.ticks.map((v) => fmt(v, dec).length)) * ANCHO_CARACTER) + GUARDA_EJE
  const x0 = mIzq
  const x1 = Math.max(x0 + ANCHO_MIN_PLANO, ancho - M_DER)
  const y0 = M_SUP_BARRAS
  const y1 = alto - M_INF_BARRAS
  const py = (v: number) => y1 - ((v - vmin) / (vmax - vmin)) * (y1 - y0)
  const slot = datos.length ? (x1 - x0) / datos.length : 0
  const grosor = Math.min(48, slot * 0.6)
  const sello = textoSello(origen, t)
  const nombre = titulo ?? t('piezas.grafico.titulo_barras')
  const resumen = datos.length
    ? t('piezas.grafico.resumen_barras', {
        titulo: nombre,
        valores: datos.map((d) => `${d.etiqueta} ${fmt(d.valor, dec)}`).join(', '),
        unidad,
        sello,
      })
    : t('piezas.grafico.resumen_barras_vacio', { titulo: nombre, sello })
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
                {fmt(v, dec)}
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
                {rotular && (
                  <text className="grafico__eje grafico__eje--valor" x={cx} y={(d.valor >= 0 ? y : py(0)) - 6} textAnchor="middle">
                    {fmt(d.valor, dec)}
                  </text>
                )}
                <text className="grafico__eje" x={cx} y={y1 + 18} textAnchor="middle">
                  {recortar(d.corta ?? d.etiqueta, slot - 4)}
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

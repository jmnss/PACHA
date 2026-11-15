import { useT } from '../../idioma/useT'
import { PROVINCIAS } from './geometria'
import { ANCHO_FRANJA, LUGARES, proyectar } from './lugares'

const ROTULO: Record<string, { dx: number; dy: number; fin?: boolean }> = {
  daule: { dx: -19, dy: 12, fin: true },
  casitagua: { dx: 20, dy: -10 },
  mazar: { dx: 21, dy: 13 },
}

/** Ecuador continental real (geoBoundaries) con los tres lugares y la franja de unos 240 km, quieta e ilustrativa. */
export function Localizador() {
  const { t } = useT()
  const x0 = 300 - ANCHO_FRANJA / 2
  return (
    <figure className="localizador">
      <svg viewBox="-110 0 720 640" role="img" aria-labelledby="inicio-loc-t">
        <title id="inicio-loc-t">{t('inicio.localizador.titulo')}</title>
        <defs><clipPath id="inicio-clip-loc"><rect x="-110" y="0" width="720" height="640" /></clipPath></defs>
        {PROVINCIAS.map((d, i) => <path key={i} className="localizador__prov" d={d} />)}
        <g clipPath="url(#inicio-clip-loc)"><g transform="rotate(-11 300 320)">
          <rect className="localizador__franja" x={x0} y="-200" width={ANCHO_FRANJA} height="1040" />
          <line className="localizador__franja-borde" x1={x0} y1="-200" x2={x0} y2="840" />
          <line className="localizador__franja-frente" x1={x0 + ANCHO_FRANJA} y1="-200" x2={x0 + ANCHO_FRANJA} y2="840" />
        </g></g>
        {LUGARES.map((l) => {
          const [x, y] = proyectar(l.lon, l.lat)
          const r = ROTULO[l.id]
          return (
            <g key={l.id}>
              <circle className="localizador__lugar" cx={x} cy={y} r="10" />
              <text x={x + r.dx} y={y + r.dy} textAnchor={r.fin ? 'end' : 'start'}>{t(`inicio.lugar.${l.id}.nombre` as 'inicio.lugar.mazar.nombre')}</text>
            </g>
          )
        })}
        <path className="localizador__escala" d={`M380,600 h${ANCHO_FRANJA} M380,592 v16 M${380 + ANCHO_FRANJA},592 v16`} />
        <text className="localizador__suave" x={380 + ANCHO_FRANJA / 2} y="582" textAnchor="middle">240 km</text>
      </svg>
      <figcaption className="inicio__nota">{t('inicio.localizador.nota')}</figcaption>
    </figure>
  )
}

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { Clave } from '../../idioma/traductor'
import { useMovil } from '../../estado/useMovil'
import { useT } from '../../idioma/useT'
import { LIENZO, PERFIL } from './geometria'
import { LUGARES, type IdLugar } from './lugares'

const lugarDaule = PERFIL.lugares.daule
const R = PERFIL.regiones

// Rótulos situados con las alturas reales: regiones por la cota de 1000 m (criterio de dibujo), páramo en la cima.
const ROTULOS: readonly { clave: Clave; x: number; y: number; tipo: 'region' | 'zona' | 'mar' }[] = [
  { clave: 'inicio.perfil.pacifico', x: Math.max(3.4, R.mar), y: 84, tipo: 'mar' },
  { clave: 'inicio.perfil.costa', x: R.costa, y: 94, tipo: 'region' },
  { clave: 'inicio.perfil.sierra', x: R.sierra, y: 94, tipo: 'region' },
  { clave: 'inicio.perfil.amazonia', x: R.amazonia, y: 94, tipo: 'region' },
  { clave: 'inicio.perfil.llanura', x: R.costa, y: lugarDaule.y - 12, tipo: 'zona' },
  { clave: 'inicio.perfil.paramo', x: PERFIL.cima.x, y: PERFIL.cima.y - 4, tipo: 'zona' },
  { clave: 'inicio.perfil.selva', x: R.amazonia, y: 80, tipo: 'zona' },
]

/** Lámina de agua de un embalse a su cota, centrada en su punto del corte. */
const embalse = ({ xLienzo: x, yLienzo: y }: { xLienzo: number; yLienzo: number }) =>
  `M${x - 9},${y} L${x + 9},${y} L${x + 5},${y + 6} L${x - 5},${y + 6} Z`

/** Exageración vertical con el tamaño real del dibujo (se estira con preserveAspectRatio="none"). */
function exageracion(ancho: number, alto: number): number {
  const vertical = (alto / LIENZO.alto) * PERFIL.porMetroVertical
  const horizontal = (ancho / LIENZO.ancho) * PERFIL.porMetroHorizontal
  return Math.round(vertical / horizontal)
}

interface Props {
  elegido: IdLugar
  onElegir: (id: IdLugar) => void
}

/**
 * Perfil real oeste-este por tramos (Copernicus DEM GLO-30, `perfil.json`), con escala vertical rotulada, su exageración
 * y los tres lugares como botones a su altura. La única animación de Inicio es el haz que lo cruza (y hace crecer la
 * capa en curso del registro); con `prefers-reduced-motion` queda quieto.
 */
export function PerfilEcuador({ elegido, onElegir }: Props) {
  const { t } = useT()
  const movil = useMovil()
  const raiz = useRef<HTMLDivElement>(null)
  const [veces, setVeces] = useState(() => exageracion(LIENZO.ancho, LIENZO.alto))

  useEffect(() => {
    const el = raiz.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const medir = () => {
      const r = el.getBoundingClientRect()
      if (r.width > 0 && r.height > 0) setVeces(exageracion(r.width, r.height))
    }
    medir()
    const ro = new ResizeObserver(medir)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const techo = PERFIL.niveles[PERFIL.niveles.length - 1]
  return (
    <div ref={raiz} className="perfil" role="group" aria-label={t('inicio.perfil.aria')} aria-describedby="inicio-perfil-corte">
      <p id="inicio-perfil-corte" className="solo-lectores">
        {t('inicio.perfil_real.corte', { km: Math.round(PERFIL.largoKm), max: PERFIL.maxM })}
      </p>
      <svg className="perfil__svg" viewBox={`0 0 ${LIENZO.ancho} ${LIENZO.alto}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <path className="perfil__nivel" d={PERFIL.niveles.map((n) => `M0,${n.y} H${LIENZO.ancho}`).join(' ')} />
      </svg>
      <div className="perfil__pasada" aria-hidden="true">
        <svg className="perfil__satelite" viewBox="0 0 46 22" fill="none" stroke="currentColor" strokeWidth="1.5" focusable="false">
          <rect className="perfil__satelite-cuerpo" x="18" y="5" width="10" height="10" rx="1.5" />
          <path className="perfil__satelite-panel" d="M2 7h14v6H2zM30 7h14v6H30z" />
          <path d="M16 10h2M28 10h2M23 15v4M9 7v6M37 7v6" />
        </svg>
        <span className="perfil__satelite-nota">{t('inicio.perfil.pasada')}</span>
        <span className="perfil__haz" />
      </div>
      <div className="perfil__tierra">
        <svg className="perfil__svg" viewBox={`0 0 ${LIENZO.ancho} ${LIENZO.alto}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <defs><clipPath id="inicio-clip-tierra"><path d={PERFIL.tierra} /></clipPath></defs>
          <path className="perfil__mar" d={PERFIL.mar} />
          <path className="perfil__cuerpo" d={PERFIL.tierra} />
          <rect className="perfil__altura" x="0" y="0" width={LIENZO.ancho} height={PERFIL.yAlta} clipPath="url(#inicio-clip-tierra)" />
          <path className="perfil__selva" d={PERFIL.selva} />
          <g clipPath="url(#inicio-clip-tierra)">
            <path className="perfil__estrato" d="M0,378 C200,372 330,386 470,376 S760,370 1000,382 M0,392 C240,388 420,396 620,390 S860,388 1000,394" />
          </g>
          <path className="perfil__embalse" d={embalse(PERFIL.lugares.daule)} />
          <path className="perfil__embalse" d={embalse(PERFIL.lugares.mazar)} />
          <path className="perfil__suelo" d={PERFIL.suelo} />
        </svg>
        {PERFIL.niveles.map((n) => (
          <span key={n.m} className="perfil__rotulo perfil__rotulo--esquema" data-cota={n.m}
            style={{ '--x': 100, '--y': (n.y / LIENZO.alto) * 100, transform: 'translate(calc(-100% - var(--space-2)), -100%)' } as CSSProperties}>
            {t('inicio.perfil_real.cota', { m: n.m })}
          </span>
        ))}
        <span className={movil ? 'solo-lectores' : 'perfil__rotulo perfil__rotulo--esquema'} data-testid="perfil-exageracion"
          style={{ '--x': 100, '--y': (techo.y / LIENZO.alto) * 100 - 5, transform: 'translate(calc(-100% - var(--space-2)), -100%)', fontStyle: 'normal', textAlign: 'right' } as CSSProperties}>
          {t('inicio.perfil_real.exageracion', { n: veces })}
          {' · '}
          <a href={PERFIL.fuente.url} target="_blank" rel="noopener noreferrer" title={PERFIL.fuente.licencia}
            style={{ pointerEvents: 'auto', color: 'var(--laguna-tinta)' }}>
            {t('inicio.perfil_real.fuente')}
          </a>
        </span>
        {ROTULOS.map((r) => (
          <span key={r.clave} className={`perfil__rotulo perfil__rotulo--${r.tipo}`} aria-hidden="true"
            style={{ '--x': r.x, '--y': r.y } as CSSProperties}>{t(r.clave)}</span>
        ))}
        {LUGARES.map((l) => {
          const p = PERFIL.lugares[l.id]
          return (
            <button key={l.id} type="button" aria-pressed={l.id === elegido} aria-controls="inicio-nota-lugar"
              className={l.perfil.derecha ? 'perfil__marca perfil__marca--derecha' : 'perfil__marca'}
              style={{ '--x': p.x, '--y': p.y, '--guia': `${l.perfil.guia}px` } as CSSProperties}
              onClick={() => onElegir(l.id)}>
              <span className="perfil__cartela">
                <span className="perfil__nombre">{t(`inicio.lugar.${l.id}.nombre` as Clave)}</span>
                <span className="perfil__donde">{t(`inicio.lugar.${l.id}.corto` as Clave)}</span>
              </span>
              <span className="perfil__guia" aria-hidden="true" />
              <span className="perfil__punto" aria-hidden="true" />
            </button>
          )
        })}
      </div>
    </div>
  )
}

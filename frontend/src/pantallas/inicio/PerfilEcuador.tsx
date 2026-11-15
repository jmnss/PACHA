import type { CSSProperties } from 'react'
import type { Clave } from '../../idioma/traductor'
import { useT } from '../../idioma/useT'
import { PERFIL } from './geometria'
import { LUGARES, type IdLugar } from './lugares'

const ROTULOS: readonly { clave: Clave; x: number; y: number; tipo: 'region' | 'zona' | 'mar' }[] = [
  { clave: 'inicio.perfil.pacifico', x: 3.4, y: 84, tipo: 'mar' },
  { clave: 'inicio.perfil.costa', x: 20, y: 94, tipo: 'region' },
  { clave: 'inicio.perfil.sierra', x: 61, y: 94, tipo: 'region' },
  { clave: 'inicio.perfil.amazonia', x: 87, y: 94, tipo: 'region' },
  { clave: 'inicio.perfil.llanura', x: 14, y: 73, tipo: 'zona' },
  { clave: 'inicio.perfil.nublado', x: 40, y: 76, tipo: 'zona' },
  { clave: 'inicio.perfil.paramo', x: 67, y: 17, tipo: 'zona' },
  { clave: 'inicio.perfil.valle', x: 60, y: 58, tipo: 'zona' },
  { clave: 'inicio.perfil.selva', x: 90, y: 77, tipo: 'zona' },
]

interface Props {
  elegido: IdLugar
  onElegir: (id: IdLugar) => void
}

/**
 * Perfil oeste-este (de B), sin cifras de altitud, con los tres lugares como botones a su altura. La única animación de Inicio
 * es el haz que lo cruza (y hace crecer la capa en curso del registro); con `prefers-reduced-motion` queda quieto.
 */
export function PerfilEcuador({ elegido, onElegir }: Props) {
  const { t } = useT()
  return (
    <div className="perfil" role="group" aria-label={t('inicio.perfil.aria')}>
      <svg className="perfil__svg" viewBox="0 0 1000 400" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <path className="perfil__nivel" d="M0,110 H1000 M0,190 H1000 M0,270 H1000" />
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
        <svg className="perfil__svg" viewBox="0 0 1000 400" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <defs><clipPath id="inicio-clip-tierra"><path d={PERFIL.tierra} /></clipPath></defs>
          <path className="perfil__mar" d="M0,352 L90,352 L90,400 L0,400 Z" />
          <path className="perfil__ola" d="M4,362 Q10,359 16,362 T28,362 T40,362 M8,376 Q14,373 20,376 T32,376" />
          <path className="perfil__cuerpo" d={PERFIL.tierra} />
          <rect className="perfil__altura" x="0" y="0" width="1000" height="186" clipPath="url(#inicio-clip-tierra)" />
          <path className="perfil__selva" d="M780,264 798,290 820,311 852,327 890,337 940,342 1000,345 L1000,361 940,358 890,353 852,343 820,327 798,306 780,280 Z" />
          <path className="perfil__estrato" d="M64,378 C200,372 330,386 470,376 S760,370 1000,382 M64,392 C240,388 420,396 620,390 S860,388 1000,394" />
          <path className="perfil__embalse" d="M226,348 L240,354 L256,362 L276,366 L296,364 L310,356 L322,348 Z" />
          <path className="perfil__embalse" d="M717.3,212 L720,222 L730,224 L738,214 L739.2,212 Z" />
          <path className="perfil__suelo" d={PERFIL.suelo} />
        </svg>
        {ROTULOS.map((r) => (
          <span key={r.clave} className={`perfil__rotulo perfil__rotulo--${r.tipo}`} aria-hidden="true"
            style={{ '--x': r.x, '--y': r.y } as CSSProperties}>{t(r.clave)}</span>
        ))}
        {LUGARES.map((l) => (
          <button key={l.id} type="button" aria-pressed={l.id === elegido} aria-controls="inicio-nota-lugar"
            className={l.perfil.derecha ? 'perfil__marca perfil__marca--derecha' : 'perfil__marca'}
            style={{ '--x': l.perfil.x, '--y': l.perfil.y, '--guia': `${l.perfil.guia}px` } as CSSProperties}
            onClick={() => onElegir(l.id)}>
            <span className="perfil__cartela">
              <span className="perfil__nombre">{t(`inicio.lugar.${l.id}.nombre` as Clave)}</span>
              <span className="perfil__donde">{t(`inicio.lugar.${l.id}.corto` as Clave)}</span>
            </span>
            <span className="perfil__guia" aria-hidden="true" />
            <span className="perfil__punto" aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  )
}

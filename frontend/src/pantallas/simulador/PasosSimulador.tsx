import type { ReactNode } from 'react'
import { useT } from '../../idioma/useT'

interface Props {
  /** Paso en curso: 1 fenómeno, 2 lugar, 3 ajusta y desata. */
  paso: 1 | 2 | 3
  fenomeno?: ReactNode
  lugar?: ReactNode
  onFenomeno: () => void
}

/** Indicador de los tres pasos; los hechos muestran lo elegido y el fenómeno se puede cambiar. */
export function PasosSimulador({ paso, fenomeno, lugar, onFenomeno }: Props) {
  const { t } = useT()
  const estado = (n: number) => (n < paso ? 'hecho' : n === paso ? 'activo' : 'pendiente')
  return (
    <nav className="pasos" aria-label={t('sim.pasos.aria')}>
      <ol className="pasos__lista">
        <li className={`pasos__paso pasos__paso--${estado(1)}`} aria-current={paso === 1 ? 'step' : undefined}>
          <span className="pasos__numero num" aria-hidden="true">1</span>
          {paso > 1 && fenomeno ? (
            <button type="button" className="pasos__cambiar" onClick={onFenomeno}
              aria-label={t('sim.pasos.cambiar_fenomeno')}>
              <span className="pasos__rotulo">{t('sim.pasos.fenomeno')}:</span> {fenomeno}
            </button>
          ) : <span className="pasos__rotulo">{t('sim.pasos.fenomeno')}</span>}
        </li>
        <li className={`pasos__paso pasos__paso--${estado(2)}`} aria-current={paso === 2 ? 'step' : undefined}>
          <span className="pasos__numero num" aria-hidden="true">2</span>
          <span><span className="pasos__rotulo">{t('sim.pasos.lugar')}</span>{paso > 1 && lugar ? <>: {lugar}</> : null}</span>
        </li>
        <li className={`pasos__paso pasos__paso--${estado(3)}`} aria-current={paso === 3 ? 'step' : undefined}>
          <span className="pasos__numero num" aria-hidden="true">3</span>
          <span className="pasos__rotulo">{t('sim.pasos.ajusta')}</span>
        </li>
      </ol>
    </nav>
  )
}

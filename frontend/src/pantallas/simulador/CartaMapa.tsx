import type { ReactNode } from 'react'
import { useT } from '../../idioma/useT'
import { gradosMinutos, marcasCoordenadas } from './carta'

interface Props {
  /** [oeste, sur, este, norte] del mundo, en grados. */
  bbox: number[]
  children: ReactNode
}

/** Hoja con margen: el tablero dentro y las coordenadas reales del mundo en sus bordes (arriba y a la izquierda). */
export function CartaMapa({ bbox, children }: Props) {
  const { t } = useT()
  const [oeste, sur, este, norte] = bbox
  const lon = marcasCoordenadas(oeste, este)
  const lat = marcasCoordenadas(sur, norte)
  return (
    <div className="carta">
      <div className="carta__margen carta__margen--arriba" aria-hidden="true">
        {lon.map((m) => (
          <span key={m.valor} className="carta__marca num" style={{ left: `${(100 * m.fraccion).toFixed(2)}%` }}>
            {gradosMinutos(m.valor, t('sim.carta.este'), t('sim.carta.oeste'))}
          </span>
        ))}
      </div>
      <div className="carta__margen carta__margen--izquierda" aria-hidden="true">
        {lat.map((m) => (
          <span key={m.valor} className="carta__marca num" style={{ top: `${(100 * (1 - m.fraccion)).toFixed(2)}%` }}>
            {gradosMinutos(m.valor, t('sim.carta.norte'), t('sim.carta.sur'))}
          </span>
        ))}
      </div>
      <div className="carta__hoja">{children}</div>
    </div>
  )
}

import type { EventoDto } from '../../api/simulador'
import { useT } from '../../idioma/useT'
import type { Momento } from './promptIA'
import { TarjetaAccion } from './TarjetaAccion'

type Accion = EventoDto['acciones']['acciones'][number]

interface Props {
  momento: Momento
  acciones: Accion[]
  abierto?: boolean
}

/** Tarjeta desplegable de un momento (antes, durante o después) con sus acciones ya ordenadas por prioridad. */
export function MomentoAcciones({ momento, acciones, abierto = false }: Props) {
  const { t } = useT()
  if (acciones.length === 0) return null
  const urgentes = acciones.filter((a) => a.prioridad === 'alta').length
  return (
    <details className="momento-acciones" open={abierto}>
      <summary>
        <span className="momento-acciones__nombre">{t(`sim.acc.momento.${momento}` as const)}</span>
        <span className="momento-acciones__cuenta num">
          {urgentes > 0 ? t('sim.acc.cuenta_urgentes', { n: acciones.length, u: urgentes }) : t('sim.acc.cuenta', { n: acciones.length })}
        </span>
      </summary>
      <ul className="momento-acciones__lista">
        {acciones.map((a) => <TarjetaAccion key={a.id} accion={a} />)}
      </ul>
    </details>
  )
}

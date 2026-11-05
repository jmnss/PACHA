import type { EventoDto, MundoDto } from '../../api/simulador'
import { Tarjeta } from '../../diseno/Tarjeta'
import type { EstadoSimulador } from './estadoSimulador'

interface Props { evento: EventoDto; mundo: MundoDto; estado: EstadoSimulador }

/** Marcador de posición: los resultados completos llegan en la Tarea 6. */
export function ResultadosEvento({ evento }: Props) {
  return <Tarjeta titulo={evento.titulo}><p className="simulador__nota">Simulación terminada.</p></Tarjeta>
}

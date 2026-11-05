import { useId } from 'react'
import type { Contexto, Escenario } from '../../api/consultas'
import { Boton } from '../../diseno/Boton'
import { CintaPasadas, type Temporada } from '../../tiempo/CintaPasadas'
import { ControlesReproductor } from '../../tiempo/ControlesReproductor'
import { formatearFecha } from '../../tiempo/fechas'
import { temporadaDelMes, vecinas } from './derivados'
import type { TiempoObservatorio } from './useTiempoObservatorio'

const MOTIVO_PASOS_CORTOS = 'Este escenario no tiene modelo continuo: el reproductor solo avanza de pasada en pasada.'

interface Props {
  pasadas: Escenario['adquisiciones']
  tiempo: TiempoObservatorio
  contexto?: Contexto | null
  temporadas: Temporada[]
  /** Se llama antes de cualquier gesto sobre el tiempo (p. ej. para pasar a «modelo en el tiempo»). */
  alInteractuar?: () => void
  /** Fija la pasada activa como «antes» o «después» del cambio; null = no se puede (con su motivo). */
  onFijarAntes?: () => void
  onFijarDespues?: () => void
  motivoAntes?: string
  motivoDespues?: string
  /** Motivo por el que el reproductor está desactivado (p. ej. se está calculando un escenario). */
  motivoReproductor?: string
  /** El escenario tiene modelo continuo: se admiten pasos menores que una pasada (fotogramas). */
  pasosCortos?: boolean
}

/** Reloj, cinta de pasadas y controles de tiempo: la misma cinta bajo todas las vistas del Observatorio. */
export function BloqueTiempo({ pasadas, tiempo, contexto, temporadas, alInteractuar, onFijarAntes, onFijarDespues, motivoAntes, motivoDespues, motivoReproductor, pasosCortos }: Props) {
  const idMotivos = useId()
  const ts = pasadas.map((p) => Date.parse(p.instante))
  const { anterior, siguiente } = vecinas(ts, tiempo.ms)
  const temporada = temporadaDelMes(contexto, tiempo.ms)
  const antes = (f: () => void) => () => { alInteractuar?.(); f() }
  const fecha = (t: number | null) => (t === null ? '—' : formatearFecha(new Date(t).toISOString()) ?? '—')

  return (
    <div className="bloque-tiempo">
      <p className="bloque-tiempo__reloj num" aria-live="off" data-testid="reloj">
        <span>Pasada anterior · {fecha(anterior)}</span>
        <span>Siguiente · {fecha(siguiente)}</span>
        {temporada && <span>Temporada {temporada.toLowerCase()}</span>}
      </p>
      <CintaPasadas
        adquisiciones={pasadas}
        instante={tiempo.instante}
        temporadas={temporadas}
        onCambio={(iso) => { alInteractuar?.(); tiempo.desdeCinta(iso) }}
      />
      <ControlesReproductor
        pasoMin={tiempo.pasoMin} onPaso={tiempo.setPasoMin}
        velocidad={tiempo.velocidad} onVelocidad={tiempo.setVelocidad}
        reproduciendo={tiempo.reproduciendo}
        onPlay={antes(tiempo.play)} onPausa={tiempo.pausa}
        onInicio={antes(tiempo.inicio)} onFinal={antes(tiempo.final)}
        onAtras={antes(tiempo.atras)} onAdelante={antes(tiempo.adelante)}
        motivoPasosCortos={pasosCortos ? undefined : MOTIVO_PASOS_CORTOS}
        deshabilitado={motivoReproductor ?? (pasadas.length < 2 ? 'Este escenario tiene una sola pasada.' : undefined)}
      />
      {(onFijarAntes || onFijarDespues) && (
        <div className="bloque-tiempo__fijar">
          <Boton variante="secundario" onClick={onFijarAntes} disabled={!!motivoAntes} aria-describedby={motivoAntes ? `${idMotivos}-antes` : undefined}>Fijar como «antes»</Boton>
          <Boton variante="secundario" onClick={onFijarDespues} disabled={!!motivoDespues} aria-describedby={motivoDespues ? `${idMotivos}-despues` : undefined}>Fijar como «después»</Boton>
        </div>
      )}
      {(motivoAntes || motivoDespues) && (
        <div className="bloque-tiempo__motivos">
          {motivoAntes && <p id={`${idMotivos}-antes`}>{motivoAntes}</p>}
          {motivoDespues && <p id={`${idMotivos}-despues`}>{motivoDespues}</p>}
        </div>
      )}
    </div>
  )
}

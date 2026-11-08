import { useId } from 'react'
import type { Contexto, Escenario } from '../../api/consultas'
import { useT } from '../../idioma/useT'
import { Boton } from '../../diseno/Boton'
import { CintaPasadas, type Temporada } from '../../tiempo/CintaPasadas'
import { ControlesReproductor } from '../../tiempo/ControlesReproductor'
import { formatearFecha } from '../../tiempo/fechas'
import { nombreTemporada, temporadaDelMes, vecinas } from './derivados'
import type { TiempoObservatorio } from './useTiempoObservatorio'

interface Props {
  pasadas: Escenario['adquisiciones']
  /** Instante ISO del evento: la cinta lo marca. */
  evento?: string
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
export function BloqueTiempo({ pasadas, evento, tiempo, contexto, temporadas, alInteractuar, onFijarAntes, onFijarDespues, motivoAntes, motivoDespues, motivoReproductor, pasosCortos }: Props) {
  const { t, idioma } = useT()
  const idMotivos = useId()
  const ts = pasadas.map((p) => Date.parse(p.instante))
  const { anterior, siguiente } = vecinas(ts, tiempo.ms)
  const temporada = temporadaDelMes(contexto, tiempo.ms)
  const antes = (f: () => void) => () => { alInteractuar?.(); f() }
  const fecha = (ms1: number | null) => (ms1 === null ? '—' : formatearFecha(new Date(ms1).toISOString(), idioma) ?? '—')

  return (
    <div className="bloque-tiempo">
      <p className="bloque-tiempo__reloj num" aria-live="off" data-testid="reloj">
        <span>{t('obs.tiempo.anterior', { fecha: fecha(anterior) })}</span>
        <span>{t('obs.tiempo.siguiente', { fecha: fecha(siguiente) })}</span>
        {temporada && <span>{t('obs.tiempo.temporada', { temporada: nombreTemporada(temporada, t).toLowerCase() })}</span>}
      </p>
      <CintaPasadas
        adquisiciones={pasadas}
        evento={evento}
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
        motivoPasosCortos={pasosCortos ? undefined : t('obs.tiempo.sin_modelo_continuo')}
        deshabilitado={motivoReproductor ?? (pasadas.length < 2 ? t('obs.tiempo.una_pasada') : undefined)}
      />
      {(onFijarAntes || onFijarDespues) && (
        <div className="bloque-tiempo__fijar">
          <Boton variante="secundario" onClick={onFijarAntes} disabled={!!motivoAntes} aria-describedby={motivoAntes ? `${idMotivos}-antes` : undefined}>{t('obs.tiempo.fijar_antes')}</Boton>
          <Boton variante="secundario" onClick={onFijarDespues} disabled={!!motivoDespues} aria-describedby={motivoDespues ? `${idMotivos}-despues` : undefined}>{t('obs.tiempo.fijar_despues')}</Boton>
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

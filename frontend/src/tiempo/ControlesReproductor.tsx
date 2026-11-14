import { useId } from 'react'
import { useT } from '../idioma/useT'
import type { Clave } from '../idioma/traductor'
import { Boton } from '../diseno/Boton'
import { Selector } from '../diseno/Selector'
import { IconoAdelante, IconoAtras, IconoEvento, IconoFinal, IconoInicio, IconoPausa, IconoPlay } from '../diseno/iconos'

export const PASOS = [
  { min: 1, clave: 'piezas.tiempo.paso.1' as Clave },
  { min: 10, clave: 'piezas.tiempo.paso.10' as Clave },
  { min: 60, clave: 'piezas.tiempo.paso.60' as Clave },
  { min: 360, clave: 'piezas.tiempo.paso.360' as Clave },
  { min: 1440, clave: 'piezas.tiempo.paso.1440' as Clave },
  { min: 17280, clave: 'piezas.tiempo.paso.17280' as Clave },
] as const

export const VELOCIDADES = {
  lenta: { clave: 'piezas.tiempo.velocidad.lenta' as Clave, ms: 1000 },
  normal: { clave: 'piezas.tiempo.velocidad.normal' as Clave, ms: 500 },
  rapida: { clave: 'piezas.tiempo.velocidad.rapida' as Clave, ms: 250 },
} as const
export type Velocidad = keyof typeof VELOCIDADES

interface Props {
  pasoMin: number
  onPaso: (min: number) => void
  velocidad: Velocidad
  onVelocidad: (v: Velocidad) => void
  reproduciendo: boolean
  onPlay: () => void
  onPausa: () => void
  onInicio: () => void
  onFinal: () => void
  onAtras: () => void
  onAdelante: () => void
  onEvento?: () => void
  /** Motivo visible por el que los controles están desactivados. */
  deshabilitado?: string
  /** Motivo visible por el que los pasos más cortos que una pasada no se pueden elegir. */
  motivoPasosCortos?: string
}

/** Paso que lleva de pasada en pasada (12 días): el único que el mapa puede mostrar hoy. */
export const PASO_PASADA = 17280

/** Inicio, −paso, play/pausa, +paso, final, ir al evento, paso y velocidad. */
export function ControlesReproductor(p: Props) {
  const { t } = useT()
  const off = p.deshabilitado !== undefined
  const etqPlay = t(p.reproduciendo ? 'piezas.tiempo.reproductor.pausa' : 'piezas.tiempo.reproductor.reproducir')
  const idMotivo = useId()
  const idCortos = useId()
  return (
    <div className="reproductor" role="group" aria-label={t('piezas.tiempo.reproductor.grupo')} aria-describedby={off ? idMotivo : undefined}>
      <div className="reproductor__botones">
        <Boton variante="terciario" aria-label={t('piezas.tiempo.reproductor.ir_inicio')} title={t('piezas.tiempo.reproductor.ir_inicio')} icono={<IconoInicio />} onClick={p.onInicio} disabled={off} />
        <Boton variante="terciario" aria-label={t('piezas.tiempo.reproductor.retroceder')} title={t('piezas.tiempo.reproductor.retroceder')} icono={<IconoAtras />} onClick={p.onAtras} disabled={off} />
        <Boton variante="primario" aria-label={etqPlay} title={etqPlay}
          icono={p.reproduciendo ? <IconoPausa /> : <IconoPlay />} onClick={p.reproduciendo ? p.onPausa : p.onPlay} disabled={off} />
        <Boton variante="terciario" aria-label={t('piezas.tiempo.reproductor.avanzar')} title={t('piezas.tiempo.reproductor.avanzar')} icono={<IconoAdelante />} onClick={p.onAdelante} disabled={off} />
        <Boton variante="terciario" aria-label={t('piezas.tiempo.reproductor.ir_final')} title={t('piezas.tiempo.reproductor.ir_final')} icono={<IconoFinal />} onClick={p.onFinal} disabled={off} />
        {p.onEvento && (
          <Boton variante="terciario" aria-label={t('piezas.tiempo.reproductor.ir_evento')} title={t('piezas.tiempo.reproductor.ir_evento')} icono={<IconoEvento />} onClick={p.onEvento} disabled={off} />
        )}
      </div>
      <div className="reproductor__ajustes">
        <Selector etiqueta={t('piezas.tiempo.reproductor.paso')} value={String(p.pasoMin)} disabled={off}
          aria-describedby={p.motivoPasosCortos ? idCortos : undefined}
          onChange={(e) => p.onPaso(Number(e.target.value))}
          opciones={PASOS.map((o) => ({ valor: String(o.min), texto: t(o.clave), deshabilitada: !!p.motivoPasosCortos && o.min < PASO_PASADA }))} />
        <Selector etiqueta={t('piezas.tiempo.reproductor.velocidad')} value={p.velocidad} disabled={off}
          onChange={(e) => p.onVelocidad(e.target.value as Velocidad)}
          opciones={(Object.keys(VELOCIDADES) as Velocidad[]).map((k) => ({ valor: k, texto: t(VELOCIDADES[k].clave) }))} />
      </div>
      {p.motivoPasosCortos && <p id={idCortos} className="reproductor__motivo">{p.motivoPasosCortos}</p>}
      {off && <p id={idMotivo} className="reproductor__motivo" role="status">{p.deshabilitado}</p>}
    </div>
  )
}

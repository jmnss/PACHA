import { useId } from 'react'
import { Boton } from '../diseno/Boton'
import { Selector } from '../diseno/Selector'
import { IconoAdelante, IconoAtras, IconoEvento, IconoFinal, IconoInicio, IconoPausa, IconoPlay } from '../diseno/iconos'

export const PASOS = [
  { min: 1, texto: '1 min' },
  { min: 10, texto: '10 min' },
  { min: 60, texto: '1 h' },
  { min: 360, texto: '6 h' },
  { min: 1440, texto: '1 día' },
  { min: 17280, texto: '12 días' },
] as const

export const VELOCIDADES = {
  lenta: { texto: 'Lenta (1 s)', ms: 1000 },
  normal: { texto: 'Normal (0,5 s)', ms: 500 },
  rapida: { texto: 'Rápida (0,25 s)', ms: 250 },
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
  const off = p.deshabilitado !== undefined
  const idMotivo = useId()
  const idCortos = useId()
  return (
    <div className="reproductor" role="group" aria-label="Controles de tiempo" aria-describedby={off ? idMotivo : undefined}>
      <div className="reproductor__botones">
        <Boton variante="terciario" aria-label="Ir al inicio" title="Ir al inicio" icono={<IconoInicio />} onClick={p.onInicio} disabled={off} />
        <Boton variante="terciario" aria-label="Retroceder un paso" title="Retroceder un paso" icono={<IconoAtras />} onClick={p.onAtras} disabled={off} />
        <Boton variante="primario" aria-label={p.reproduciendo ? 'Pausa' : 'Reproducir'} title={p.reproduciendo ? 'Pausa' : 'Reproducir'}
          icono={p.reproduciendo ? <IconoPausa /> : <IconoPlay />} onClick={p.reproduciendo ? p.onPausa : p.onPlay} disabled={off} />
        <Boton variante="terciario" aria-label="Avanzar un paso" title="Avanzar un paso" icono={<IconoAdelante />} onClick={p.onAdelante} disabled={off} />
        <Boton variante="terciario" aria-label="Ir al final" title="Ir al final" icono={<IconoFinal />} onClick={p.onFinal} disabled={off} />
        {p.onEvento && (
          <Boton variante="terciario" aria-label="Ir al evento" title="Ir al evento" icono={<IconoEvento />} onClick={p.onEvento} disabled={off} />
        )}
      </div>
      <div className="reproductor__ajustes">
        <Selector etiqueta="Paso" value={String(p.pasoMin)} disabled={off}
          aria-describedby={p.motivoPasosCortos ? idCortos : undefined}
          onChange={(e) => p.onPaso(Number(e.target.value))}
          opciones={PASOS.map((o) => ({ valor: String(o.min), texto: o.texto, deshabilitada: !!p.motivoPasosCortos && o.min < PASO_PASADA }))} />
        <Selector etiqueta="Velocidad" value={p.velocidad} disabled={off}
          onChange={(e) => p.onVelocidad(e.target.value as Velocidad)}
          opciones={(Object.keys(VELOCIDADES) as Velocidad[]).map((k) => ({ valor: k, texto: VELOCIDADES[k].texto }))} />
      </div>
      {p.motivoPasosCortos && <p id={idCortos} className="reproductor__motivo">{p.motivoPasosCortos}</p>}
      {off && <p id={idMotivo} className="reproductor__motivo" role="status">{p.deshabilitado}</p>}
    </div>
  )
}

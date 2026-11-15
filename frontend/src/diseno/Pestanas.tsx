import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import { idPanelPestana } from './panelPestana'

export interface Pestana {
  id: string
  etiqueta: ReactNode
}

interface Props {
  pestanas: Pestana[]
  activa: string
  onCambiar: (id: string) => void
  etiqueta: string
}

/**
 * Pestañas de verdad: cada una gobierna un `tabpanel` (ver `propsPanel`). Para elegir una variante de lo mismo
 * sin panel propio se usa `ControlSegmentado`. La activa lleva una línea --ocre-borde del ancho de su etiqueta.
 */
export function Pestanas({ pestanas, activa, onCambiar, etiqueta }: Props) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  const alTeclear = (e: KeyboardEvent, i: number) => {
    let j = i
    if (e.key === 'ArrowRight') j = (i + 1) % pestanas.length
    else if (e.key === 'ArrowLeft') j = (i - 1 + pestanas.length) % pestanas.length
    else if (e.key === 'Home') j = 0
    else if (e.key === 'End') j = pestanas.length - 1
    else return
    e.preventDefault()
    onCambiar(pestanas[j].id)
    refs.current[j]?.focus()
  }

  return (
    <div className="pestanas" role="tablist" aria-label={etiqueta}>
      {pestanas.map((p, i) => {
        const esActiva = p.id === activa
        return (
          <button
            key={p.id}
            ref={(el) => { refs.current[i] = el }}
            type="button"
            role="tab"
            id={`pestana-${p.id}`}
            aria-selected={esActiva}
            aria-controls={idPanelPestana(p.id)}
            tabIndex={esActiva ? 0 : -1}
            className={`pestanas__pestana${esActiva ? ' pestanas__pestana--activa' : ''}`}
            onClick={() => onCambiar(p.id)}
            onKeyDown={(e) => alTeclear(e, i)}
          >
            <span className="pestanas__etiqueta">
              {p.etiqueta}
              {esActiva && <span className="pestanas__linea" aria-hidden="true" />}
            </span>
          </button>
        )
      })}
    </div>
  )
}

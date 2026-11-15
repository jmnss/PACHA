import { useRef, type KeyboardEvent, type ReactNode } from 'react'

export interface Opcion {
  id: string
  etiqueta: ReactNode
}

interface Props {
  opciones: Opcion[]
  valor: string
  onCambiar: (id: string) => void
  etiqueta: string
}

/**
 * Elige una opción entre pocas que cambian lo que se ve, sin ser pantallas distintas (docs/diseno.md §8).
 * Es un `radiogroup` (flechas mueven y eligen), no pestañas: no hay un panel propio por opción.
 */
export function ControlSegmentado({ opciones, valor, onCambiar, etiqueta }: Props) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  const alTeclear = (e: KeyboardEvent, i: number) => {
    let j = i
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % opciones.length
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + opciones.length) % opciones.length
    else if (e.key === 'Home') j = 0
    else if (e.key === 'End') j = opciones.length - 1
    else return
    e.preventDefault()
    onCambiar(opciones[j].id)
    refs.current[j]?.focus()
  }

  return (
    <div className="segmentado" role="radiogroup" aria-label={etiqueta}>
      {opciones.map((o, i) => {
        const activa = o.id === valor
        return (
          <button
            key={o.id}
            ref={(el) => { refs.current[i] = el }}
            type="button"
            role="radio"
            aria-checked={activa}
            tabIndex={activa ? 0 : -1}
            className={`segmentado__opcion${activa ? ' segmentado__opcion--activa' : ''}`}
            onClick={() => onCambiar(o.id)}
            onKeyDown={(e) => alTeclear(e, i)}
          >
            {o.etiqueta}
          </button>
        )
      })}
    </div>
  )
}

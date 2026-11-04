import { useRef, type KeyboardEvent } from 'react'

export interface Pestana {
  id: string
  etiqueta: string
}

interface Props {
  pestanas: Pestana[]
  activa: string
  onCambiar: (id: string) => void
  etiqueta: string
}

/** La activa lleva una línea de 1 px --accent del ancho de su etiqueta; ninguna otra se marca. */
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
            tabIndex={esActiva ? 0 : -1}
            className={`pestanas__pestana${esActiva ? ' pestanas__pestana--activa' : ''}`}
            onClick={() => onCambiar(p.id)}
            onKeyDown={(e) => alTeclear(e, i)}
          >
            <span className="pestanas__etiqueta">{p.etiqueta}</span>
          </button>
        )
      })}
    </div>
  )
}

import { useId } from 'react'

interface Props {
  etiqueta: string
  activo: boolean
  onCambiar: (activo: boolean) => void
  disabled?: boolean
  /** Por qué está desactivado (los controles desactivados dicen por qué). */
  motivo?: string
}

/** 28×16, activo en blanco, no en amarillo. */
export function Interruptor({ etiqueta, activo, onCambiar, disabled, motivo }: Props) {
  const id = useId()
  return (
    <div className="interruptor-fila">
      <button
        type="button"
        role="switch"
        id={id}
        aria-checked={activo}
        aria-describedby={disabled && motivo ? `${id}-motivo` : undefined}
        disabled={disabled}
        className="interruptor"
        onClick={() => onCambiar(!activo)}
      >
        <span className="interruptor__tirador" />
      </button>
      <label htmlFor={id} className="interruptor__etiqueta">{etiqueta}</label>
      {disabled && motivo && <span id={`${id}-motivo`} className="campo__limite">{motivo}</span>}
    </div>
  )
}

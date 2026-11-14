import { useId, type InputHTMLAttributes, type ReactNode } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  etiqueta: ReactNode
  /** Límite visible bajo la etiqueta (queda enlazado con aria-describedby). */
  limite?: ReactNode
}

export function Campo({ etiqueta, limite, id, ...resto }: Props) {
  const auto = useId()
  const idCampo = id ?? auto
  const idLimite = `${idCampo}-limite`
  return (
    <div className="campo">
      <label className="campo__etiqueta" htmlFor={idCampo}>{etiqueta}</label>
      {limite && <p className="campo__limite" id={idLimite}>{limite}</p>}
      <input id={idCampo} className="campo__control" aria-describedby={limite ? idLimite : undefined} {...resto} />
    </div>
  )
}

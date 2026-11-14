import { useId, type InputHTMLAttributes, type ReactNode } from 'react'

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  etiqueta: ReactNode
  /** Valor ya formateado, con su unidad, en cifras tabulares. */
  valorTexto: string
  limite?: ReactNode
}

/** Pista de 2 px, tirador blanco de 14 px, valor en cifras tabulares. */
export function Deslizador({ etiqueta, valorTexto, limite, id, ...resto }: Props) {
  const auto = useId()
  const idCampo = id ?? auto
  const idLimite = `${idCampo}-limite`
  return (
    <div className="campo">
      <div className="deslizador__cabecera">
        <label className="campo__etiqueta" htmlFor={idCampo}>{etiqueta}</label>
        <output className="deslizador__valor num" htmlFor={idCampo}>{valorTexto}</output>
      </div>
      {limite && <p className="campo__limite" id={idLimite}>{limite}</p>}
      <input id={idCampo} type="range" className="deslizador" aria-describedby={limite ? idLimite : undefined} {...resto} />
    </div>
  )
}

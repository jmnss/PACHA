import { useId, type SelectHTMLAttributes } from 'react'
import { IconoChevron } from './iconos'

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  etiqueta: string
  opciones: { valor: string; texto: string }[]
  limite?: string
}

/** El mismo campo con un chevron de 12 px. */
export function Selector({ etiqueta, opciones, limite, id, ...resto }: Props) {
  const auto = useId()
  const idCampo = id ?? auto
  const idLimite = `${idCampo}-limite`
  return (
    <div className="campo">
      <label className="campo__etiqueta" htmlFor={idCampo}>{etiqueta}</label>
      {limite && <p className="campo__limite" id={idLimite}>{limite}</p>}
      <div className="selector">
        <select id={idCampo} className="campo__control selector__control" aria-describedby={limite ? idLimite : undefined} {...resto}>
          {opciones.map((o) => (
            <option key={o.valor} value={o.valor}>{o.texto}</option>
          ))}
        </select>
        <span className="selector__chevron"><IconoChevron tamano={12} /></span>
      </div>
    </div>
  )
}

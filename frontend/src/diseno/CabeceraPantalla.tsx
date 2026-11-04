import type { ReactNode } from 'react'

interface Props {
  titulo: string
  hallazgo?: string
  acciones?: ReactNode
  frescura?: string
}

/** Título 26/700, línea gris con el hallazgo, a la derecha solo acciones reales y la frescura. */
export function CabeceraPantalla({ titulo, hallazgo, acciones, frescura }: Props) {
  return (
    <header className="cabecera">
      <div className="cabecera__texto">
        <h1 className="cabecera__titulo">{titulo}</h1>
        {hallazgo && <p className="cabecera__hallazgo">{hallazgo}</p>}
      </div>
      {(acciones || frescura) && (
        <div className="cabecera__lado">
          {acciones}
          {frescura && <span className="cabecera__frescura num">{frescura}</span>}
        </div>
      )}
    </header>
  )
}

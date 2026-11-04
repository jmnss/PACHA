import { AVISO_NOTAS, esNotaSinVerificar } from './notasModelo'

/**
 * Notas que acompañan a un resultado del modelo de demostración. La línea de aviso va siempre encima y
 * cada nota que menciona NISAR, sus productos o la banda L lleva la marca «sin verificar».
 */
export function NotasModelo({ notas }: { notas: string[] }) {
  if (notas.length === 0) return null
  return (
    <div className="notas-modelo">
      <p className="notas-modelo__aviso">{AVISO_NOTAS}</p>
      <ul className="notas-modelo__lista">
        {notas.map((n) => (
          <li key={n}>
            {n}
            {esNotaSinVerificar(n) && <span className="notas-modelo__marca"> (sin verificar)</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}

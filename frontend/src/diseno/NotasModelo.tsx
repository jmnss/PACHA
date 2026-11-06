import { clavesApi } from '../idioma/clavesApi'
import { TextoApi } from '../idioma/TextoApi'
import { useT } from '../idioma/useT'
import { esNotaSinVerificar } from './notasModelo'

interface Props {
  notas: string[]
  /** Escenario del resultado: las notas del modelo se traducen por `api.nota.<escenario>.<n>` si el español coincide. */
  escenarioId?: string
  /** Notas que ya escribe la interfaz en el idioma activo (no son texto de la API): van tal cual, sin marca. */
  traducidas?: boolean
}

/**
 * Notas que acompañan a un resultado del modelo de demostración. La línea de aviso va siempre encima y
 * cada nota de la API que menciona NISAR, sus productos o la banda L lleva la marca «sin verificar».
 */
export function NotasModelo({ notas, escenarioId, traducidas = false }: Props) {
  const { t } = useT()
  if (notas.length === 0) return null
  return (
    <div className="notas-modelo">
      <p className="notas-modelo__aviso">{t('origen.notas.aviso')}</p>
      <ul className="notas-modelo__lista">
        {notas.map((n, k) => (
          <li key={n}>
            {traducidas ? n : <TextoApi texto={n} clave={escenarioId ? clavesApi.nota(escenarioId, k) : null} />}
            {/* La marca se decide sobre el español de la API, que es lo que se compara con la documentación. */}
            {!traducidas && esNotaSinVerificar(n) && <span className="notas-modelo__marca"> {t('origen.notas.sin_verificar')}</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}

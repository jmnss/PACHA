import { useT } from '../../idioma/useT'

/**
 * «Paso n de 4» con la columna de capas de la identidad D: cada paso recorrido deposita una capa; la del paso en
 * curso lleva el filo de ocre borde. Las capas son decorativas (el texto dice lo mismo).
 */
export function IndicadorPasos({ n, total }: { n: number; total: number }) {
  const { t } = useT()
  return (
    <div className="indicador-pasos">
      <ol className="indicador-pasos__capas" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => (
          <li
            key={i}
            className={`indicador-pasos__capa${i + 1 < n ? ' indicador-pasos__capa--hecha' : ''}${i + 1 === n ? ' indicador-pasos__capa--actual' : ''}`}
          />
        ))}
      </ol>
      <p className="indicador-pasos__texto" aria-live="polite">{t('historias.paso.indicador', { n, total })}</p>
    </div>
  )
}

import { useT } from '../../idioma/useT'

/** Huecos de la fase 2 dentro de un paso: se nombran y se marcan «Por llegar», sin cifras inventadas. */
export function PorLlegar({ elementos }: { elementos: string[] }) {
  const { t } = useT()
  if (elementos.length === 0) return null
  return (
    <div className="por-llegar">
      <ul className="por-llegar__lista">
        {elementos.map((e) => (
          <li key={e} className="por-llegar__elemento">
            <span className="por-llegar__chip">{t('historias.por_llegar')}</span>
            <span>{e}</span>
          </li>
        ))}
      </ul>
      <p className="por-llegar__nota">{t('historias.por_llegar.nota')}</p>
    </div>
  )
}

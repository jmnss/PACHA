import type { LecturaApi } from '../../api/consultas'
import { TextoApi } from '../../idioma/TextoApi'
import { useT } from '../../idioma/useT'

/** Lecturas en palabras que redacta la API: hipótesis por comprobar, nunca conclusiones. */
export function LecturasApi({ lecturas }: { lecturas: LecturaApi[] }) {
  const { t } = useT()
  if (lecturas.length === 0) return null
  return (
    <section className="lecturas-api" aria-label={t('historias.lecturas.titulo')}>
      <h4 className="lecturas-api__titulo">{t('historias.lecturas.titulo')}</h4>
      <ul className="lecturas-api__lista">
        {lecturas.map((l) => (
          <li key={l.clave_texto}>
            <TextoApi texto={l.texto} clave={l.clave_texto} valores={l.valores_texto} decimales={l.decimales_texto} />
          </li>
        ))}
      </ul>
    </section>
  )
}

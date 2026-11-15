import type { Clave } from '../../idioma/traductor'
import { useT } from '../../idioma/useT'

const SIGNOS: readonly [string, Clave][] = [
  ['agua', 'inicio.signos.agua'], ['altura', 'inicio.signos.altura'], ['haz', 'inicio.signos.haz'],
  ['franja', 'inicio.signos.franja'], ['lugar', 'inicio.signos.lugar'], ['capa', 'inicio.signos.capa'],
  ['rayado', 'inicio.signos.rayado'],
]

/** Recuadro de signos convencionales al pie del perfil (de A), con la advertencia de que el perfil no está a escala. */
export function SignosConvencionales() {
  const { t } = useT()
  return (
    <div className="signos" role="group" aria-labelledby="inicio-signos-t">
      <h2 id="inicio-signos-t" className="signos__titulo">{t('inicio.signos.titulo')}</h2>
      <ul className="signos__lista">
        {SIGNOS.map(([s, clave]) => (
          <li key={s}><span className={`signos__s signos__s--${s}`} aria-hidden="true" />{t(clave)}</li>
        ))}
      </ul>
      <p className="inicio__nota">{t('inicio.signos.esquema')}</p>
    </div>
  )
}

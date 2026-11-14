import { datosAvisoQu } from './aviso'
import { qu } from './catalogos/qu'
import { CONTENIDO_LARGO_QU_VALIDADO, VALIDADAS_QU } from './catalogos/validadas'
import { traductor } from './traductor'
import { useT } from './useT'

const ES = traductor('es').t

const CLAVES_QU = Object.keys(qu)

/**
 * Aviso del borrador en kichwa (docs/diseno.md §8 «Origen de los datos»): una fila bajo la banda de
 * demostración, con su mismo color, mientras haya textos sin validar por hablantes. Solo con `qu`.
 */
export function AvisoTraduccion() {
  const { idioma, t } = useT()
  if (idioma !== 'qu') return null
  const datos = datosAvisoQu(CLAVES_QU, VALIDADAS_QU, CONTENIDO_LARGO_QU_VALIDADO)
  if (!datos) return null
  return (
    <p className="aviso-traduccion" role="note">
      {t('idioma.aviso_qu', datos)}
      {/* Spec §2: el aviso va en kichwa y en español. */}
      <span lang="es"> · {ES('idioma.aviso_qu', datos)}</span>
    </p>
  )
}

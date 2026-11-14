import { useEstadoMotor } from '../motor/clienteMotor'
import { useT } from '../idioma/useT'

/**
 * Aviso del motor de cálculo (docs/diseno.md §8), bajo la banda de demostración. Solo en el modo `navegador`:
 * mientras una petición espera al motor que carga, o si el motor no pudo cargarse. Sin animación.
 */
export function AvisoMotor() {
  const { t } = useT()
  const { estado, esperando } = useEstadoMotor()
  if (estado === 'error') {
    return <p className="aviso-motor aviso-motor--error" role="alert">{t('estructura.motor.error')}</p>
  }
  if (estado === 'cargando' && esperando) {
    return <p className="aviso-motor" role="status">{t('estructura.motor.cargando')}</p>
  }
  return null
}

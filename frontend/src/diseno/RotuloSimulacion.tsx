import { useT } from '../idioma/useT'

/**
 * Rótulo fijo «Simulación»: va en la cabecera de las pantallas y pasos cuyo contenido es 100 % simulado
 * (Simulador, Laboratorio, paso «Simular» de las historias). No es una banda global ni se puede cerrar.
 */
export function RotuloSimulacion() {
  const { t } = useT()
  return (
    <p className="rotulo-simulacion" role="note" title={t('rotulo.simulacion.detalle')}>
      <span className="rotulo-simulacion__signo" aria-hidden="true" />
      <span className="rotulo-simulacion__nombre">{t('rotulo.simulacion')}</span>
      <span className="rotulo-simulacion__detalle">{t('rotulo.simulacion.detalle')}</span>
    </p>
  )
}

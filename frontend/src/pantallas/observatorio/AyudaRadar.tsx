import { NotasModelo } from '../../diseno/NotasModelo'
import { Termino } from '../../diseno/Termino'
import { TextoApi } from '../../idioma/TextoApi'
import { useT } from '../../idioma/useT'

interface Props {
  /** `TipoCambio.descripcion` del tipo actual (de /api/tipos); puede faltar. */
  descripcion?: string | null
  nombreTipo?: string
}

/** Ayuda plegable: cómo ve el radar el tipo de cambio actual y qué puede medir un radar de apertura sintética. */
export function AyudaRadar({ descripcion, nombreTipo }: Props) {
  const { t } = useT()
  return (
    <details className="ayuda-radar">
      <summary className="ayuda-radar__resumen">{t('obs.ayuda.resumen')}</summary>
      <div className="ayuda-radar__cuerpo">
        {descripcion && <p>{nombreTipo ? <strong><TextoApi texto={nombreTipo} />. </strong> : null}<TextoApi texto={descripcion} /></p>}
        <p>
          {t('obs.ayuda.interferometria_antes')}
          <Termino nombre={t('obs.ayuda.interferometria')} explicacion={t('obs.ayuda.interferometria_explicacion')} />
          .
        </p>
        <NotasModelo notas={[t('obs.ayuda.aviso')]} />
      </div>
    </details>
  )
}

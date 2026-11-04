import { NotasModelo } from '../../diseno/NotasModelo'
import { Termino } from '../../diseno/Termino'

interface Props {
  /** `TipoCambio.descripcion` del tipo actual (de /api/tipos); puede faltar. */
  descripcion?: string | null
  nombreTipo?: string
}

const AVISO = ['Los detalles de NISAR están pendientes de confirmar con la documentación oficial.']

/** Ayuda plegable: cómo ve el radar el tipo de cambio actual y qué puede medir un radar de apertura sintética. */
export function AyudaRadar({ descripcion, nombreTipo }: Props) {
  return (
    <details className="ayuda-radar">
      <summary className="ayuda-radar__resumen">Cómo ve el radar este tipo de cambio</summary>
      <div className="ayuda-radar__cuerpo">
        {descripcion && <p>{nombreTipo ? <strong>{nombreTipo}. </strong> : null}{descripcion}</p>}
        <p>
          Un radar como el de NISAR puede medir movimientos de la superficie a escala de centímetros mediante{' '}
          <Termino
            nombre="interferometría"
            explicacion="Técnica que compara la fase de la señal de radar de dos pasadas sobre el mismo lugar: una diferencia de fase corresponde a un desplazamiento de la superficie, del orden de centímetros."
          />
          .
        </p>
        <NotasModelo notas={AVISO} />
      </div>
    </details>
  )
}

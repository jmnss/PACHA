import { useId, useState } from 'react'
import { useEscenarios } from '../api/consultas'
import { useHayDatosSinteticos } from '../estado/useHayDatosSinteticos'
import { fechaCorta } from './origen'

/**
 * Banda de demostración (docs/diseno.md §8). Visible mientras haya datos sintéticos;
 * sin botón de cerrar. «Qué significa» abre un panel con generador, semilla y fecha.
 */
export function BandaDemostracion() {
  const hay = useHayDatosSinteticos()
  const escenarios = useEscenarios()
  const [abierto, setAbierto] = useState(false)
  const idPanel = useId()
  if (!hay) return null

  const origen = escenarios.data?.[0]?.origen
  return (
    <div className="banda-demo">
      <div className="banda-demo__fila" role="region" aria-label="Aviso de datos de demostración">
        <p className="banda-demo__texto">
          <span className="banda-demo__largo">DATOS DE DEMOSTRACIÓN · no son observaciones reales de NISAR</span>
          <span className="banda-demo__corto">DEMOSTRACIÓN · no son datos reales de NISAR</span>
        </p>
        <button
          type="button"
          className="banda-demo__enlace"
          aria-expanded={abierto}
          aria-controls={idPanel}
          onClick={() => setAbierto((a) => !a)}
        >
          Qué significa
        </button>
      </div>
      {abierto && (
        <div
          id={idPanel}
          className="banda-demo__panel"
          role="dialog"
          aria-label="Qué significa «datos de demostración»"
          onKeyDown={(e) => e.key === 'Escape' && setAbierto(false)}
        >
          <p>
            Los mapas, series y cifras que ves los fabrica un generador para enseñar cómo se vería el
            radar. No son mediciones de NISAR ni describen un hecho real. Cada dato lleva su origen.
          </p>
          {origen ? (
            <dl className="banda-demo__datos">
              <div>
                <dt>Generador</dt>
                <dd>{origen.generador ?? origen.fuente}{origen.version ? ` v${origen.version}` : ''}</dd>
              </div>
              <div>
                <dt>Semilla</dt>
                <dd className="num">{origen.semilla ?? '—'}</dd>
              </div>
              <div>
                <dt>Fecha</dt>
                <dd className="num">{fechaCorta(origen.fecha_generacion)}</dd>
              </div>
            </dl>
          ) : (
            <p className="texto-muted">Los datos de origen aún no se han cargado.</p>
          )}
          <button type="button" className="boton boton--terciario" onClick={() => setAbierto(false)}>
            Cerrar este panel
          </button>
        </div>
      )}
    </div>
  )
}

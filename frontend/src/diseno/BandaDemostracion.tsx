import { useLocation } from 'react-router-dom'
import { useEffect, useId, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useEscenarios, type Escenario } from '../api/consultas'
import { useHayDatosSinteticos } from '../estado/useHayDatosSinteticos'
import { fechaCorta } from './origen'

/**
 * Banda de demostración (docs/diseno.md §8). Visible mientras haya datos sintéticos;
 * sin botón de cerrar. «Qué significa» abre un panel con generador, semilla y fecha.
 * El panel recibe el foco al abrir; Escape o un clic fuera lo cierran y el foco vuelve al botón.
 */
export function BandaDemostracion() {
  const hay = useHayDatosSinteticos()
  const escenarios = useEscenarios()
  const cliente = useQueryClient()
  const { search } = useLocation()
  const [abierto, setAbierto] = useState(false)
  const idPanel = useId()
  const raiz = useRef<HTMLDivElement>(null)
  const boton = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!abierto) return
    panel.current?.focus()
    const fuera = (e: MouseEvent) => {
      if (raiz.current && !raiz.current.contains(e.target as Node)) {
        setAbierto(false)
        boton.current?.focus()
      }
    }
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAbierto(false)
        boton.current?.focus()
      }
    }
    document.addEventListener('mousedown', fuera)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('mousedown', fuera)
      document.removeEventListener('keydown', escape)
    }
  }, [abierto])

  if (!hay) return null

  // Si se está viendo un escenario simulado (id con «~» en la URL), su semilla y generador mandan.
  const idActual = new URLSearchParams(search).get('escenario') ?? ''
  const simulado = idActual.includes('~') ? cliente.getQueryData<Escenario>(['escenario', idActual]) : undefined
  const origen = simulado?.origen ?? escenarios.data?.[0]?.origen
  return (
    <div className="banda-demo" ref={raiz}>
      <div className="banda-demo__fila" role="region" aria-label="Aviso de datos de demostración">
        <p className="banda-demo__texto">
          <span className="banda-demo__largo">DATOS DE DEMOSTRACIÓN · no son observaciones reales de NISAR</span>
          <span className="banda-demo__corto">DEMOSTRACIÓN · no son datos reales de NISAR</span>
        </p>
        <button
          ref={boton}
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
          ref={panel}
          id={idPanel}
          tabIndex={-1}
          className="banda-demo__panel"
          role="dialog"
          aria-label="Qué significa «datos de demostración»"
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
          <button type="button" className="boton boton--terciario" onClick={() => { setAbierto(false); boton.current?.focus() }}>
            Cerrar este panel
          </button>
        </div>
      )}
    </div>
  )
}

import { useEffect, useId, useRef, useState } from 'react'
import { IconoGlobo } from '../diseno/iconos'
import { IDIOMAS } from './idiomas'
import { useT } from './useT'

/**
 * Selector de idioma al pie del riel (docs/diseno.md §7). Un botón con el globo y el código activo
 * abre un panel con tres radios nativos; cada nombre va en su propio idioma (`lang`). Las flechas cambian
 * el idioma sin cerrar (comportamiento nativo del grupo de radios); un clic en una opción, Intro, Escape o
 * un clic fuera cierran el panel y el foco vuelve al botón (mismo patrón que la banda de demostración).
 * `detail > 0` distingue el clic del puntero del clic sintético que el navegador emite con las flechas.
 */
export function SelectorIdioma() {
  const { idioma, cambiarIdioma, t } = useT()
  const [abierto, setAbierto] = useState(false)
  const idPanel = useId()
  const raiz = useRef<HTMLDivElement>(null)
  const boton = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const activo = IDIOMAS.find((i) => i.codigo === idioma) ?? IDIOMAS[0]
  const etiqueta = t('idioma.selector.etiqueta')

  const cerrar = () => {
    setAbierto(false)
    boton.current?.focus()
  }

  useEffect(() => {
    if (!abierto) return
    panel.current?.querySelector<HTMLInputElement>('input:checked')?.focus()
    const fuera = (e: MouseEvent) => {
      if (raiz.current && !raiz.current.contains(e.target as Node)) cerrar()
    }
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrar()
    }
    document.addEventListener('mousedown', fuera)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('mousedown', fuera)
      document.removeEventListener('keydown', escape)
    }
  }, [abierto])

  return (
    <div className="selector-idioma" ref={raiz}>
      <button
        ref={boton}
        type="button"
        className="riel__destino selector-idioma__boton"
        aria-label={`${etiqueta}: ${activo.corto}`}
        title={etiqueta}
        aria-expanded={abierto}
        aria-controls={idPanel}
        onClick={() => setAbierto((a) => !a)}
      >
        <IconoGlobo />
        <span className="selector-idioma__codigo" aria-hidden="true">{activo.corto}</span>
      </button>
      {abierto && (
        <div ref={panel} id={idPanel} className="selector-idioma__panel">
          <fieldset className="selector-idioma__grupo">
            <legend className="selector-idioma__leyenda">{etiqueta}</legend>
            {IDIOMAS.map((i) => (
              <label key={i.codigo} lang={i.lang} className="selector-idioma__opcion" data-no-traducir>
                <input
                  type="radio"
                  name={`${idPanel}-idioma`}
                  value={i.codigo}
                  checked={i.codigo === idioma}
                  onChange={() => cambiarIdioma(i.codigo)}
                  onClick={(e) => { if (e.detail > 0) cerrar() }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); cerrar() } }}
                  className="selector-idioma__radio"
                />
                <span className="selector-idioma__nombre">{i.nombre}</span>
              </label>
            ))}
          </fieldset>
        </div>
      )}
    </div>
  )
}

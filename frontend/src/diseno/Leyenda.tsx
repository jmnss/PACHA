import type { CSSProperties } from 'react'
import { colorDeCategoria, formatoMarcas, MARCAS, colorEnRampa, rampaDePaleta, type PaletaContrato } from './rampas'

interface Props {
  paleta: PaletaContrato
  vmin: number
  vmax: number
  unidad: string
  /** Pares [etiqueta, color heredado] del contrato; el color heredado se ignora, la muestra sale de §4. */
  leyenda?: [string, string][] | null
  /** Variable de la capa: elige la rampa secuencial (véase `rampaDePaleta`). */
  variable?: string
  /** Palabras de los extremos; por defecto, las de la divergente («menos señal» / «más señal»). */
  extremos?: [string, string]
}

const PASOS = 9

/** Leyenda junto a su capa: rampa en 9 casillas (sin degradado), 5 marcas, unidad y extremos en palabras. */
export function Leyenda({ paleta, vmin, vmax, unidad, leyenda, variable, extremos }: Props) {
  if (paleta === 'categorias') {
    return (
      <div className="leyenda" role="group" aria-label={`Leyenda, ${unidad}`}>
        <ul className="leyenda__categorias">
          {(leyenda ?? []).map(([etiqueta]) => {
            const color = colorDeCategoria(etiqueta)
            return (
              <li key={etiqueta} className="leyenda__categoria">
                <span className={color ? 'leyenda__muestra' : 'leyenda__muestra leyenda__muestra--sin'}
                  style={color ? ({ background: color } as CSSProperties) : undefined} aria-hidden="true" />
                {etiqueta}
              </li>
            )
          })}
        </ul>
        <div className="leyenda__unidad">{unidad}</div>
      </div>
    )
  }
  const rampa = rampaDePaleta(paleta, variable) ?? 'gris'
  const palabras = extremos ?? (paleta === 'divergente' ? ['menos señal', 'más señal'] : undefined)
  const marcas = formatoMarcas(vmin, vmax)
  return (
    <div className="leyenda" role="group" aria-label={`Leyenda, ${unidad}, de ${marcas[0]} a ${marcas[MARCAS - 1]}`}>
      <div className="leyenda__pasos" aria-hidden="true">
        {Array.from({ length: PASOS }, (_, i) => (
          <span key={i} className="leyenda__paso" style={{ background: colorEnRampa(rampa, i / (PASOS - 1)) }} />
        ))}
      </div>
      <div className="leyenda__marcas" aria-hidden="true">
        {marcas.map((m, i) => <span key={i}>{m}</span>)}
      </div>
      <div className="leyenda__pie">
        {palabras && <span>{palabras[0]}</span>}
        <span className="leyenda__unidad">{unidad}</span>
        {palabras && <span>{palabras[1]}</span>}
      </div>
    </div>
  )
}

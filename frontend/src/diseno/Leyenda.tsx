import type { CSSProperties } from 'react'
import { claveLeyenda } from '../idioma/clavesApi'
import { TextoApi } from '../idioma/TextoApi'
import { useT } from '../idioma/useT'
import type { Clave } from '../idioma/traductor'
import { coloresDeCategorias, formatoMarcas, MARCAS, colorEnRampa, rampaDePaleta, type PaletaContrato } from './rampas'

interface Props {
  paleta: PaletaContrato
  vmin: number
  vmax: number
  unidad: string
  /** Pares [etiqueta, color heredado] del contrato; el color heredado se ignora: la muestra sale de `COLORES_CATEGORIA`. */
  leyenda?: [string, string][] | null
  /** Variable de la capa: elige la rampa secuencial (`rampaDePaleta`) y los colores de las categorías. */
  variable?: string
  /** Palabras de los extremos; por defecto, las de la divergente («menos señal» / «más señal»). */
  extremos?: [Clave, Clave]
}

/** Extremos en palabras por defecto (§8); la cíclica no tiene extremos. */
const EXTREMOS: Partial<Record<PaletaContrato, [Clave, Clave]>> = {
  gris: ['origen.leyenda.gris_menos', 'origen.leyenda.gris_mas'],
  secuencial: ['origen.leyenda.secuencial_menos', 'origen.leyenda.secuencial_mas'],
  divergente: ['origen.leyenda.divergente_menos', 'origen.leyenda.divergente_mas'],
}

const PASOS = 9

/** Leyenda junto a su capa: rampa en 9 casillas (sin degradado), 5 marcas, unidad y extremos en palabras. */
export function Leyenda({ paleta, vmin, vmax, unidad, leyenda, variable, extremos }: Props) {
  const { t, idioma } = useT()
  if (paleta === 'categorias') {
    const items = leyenda ?? []
    const colores = coloresDeCategorias(variable ?? '', items.length, items.map(([e]) => e))
    return (
      <div className="leyenda" role="group" aria-label={unidad ? t('origen.leyenda.titulo_unidad', { unidad }) : t('origen.leyenda.titulo')}>
        <ul className="leyenda__categorias">
          {items.map(([etiqueta], i) => {
            const color = colores[i]
            return (
              <li key={etiqueta} className="leyenda__categoria">
                <span className={color ? 'leyenda__muestra' : 'leyenda__muestra leyenda__muestra--sin'}
                  style={color ? ({ background: color } as CSSProperties) : undefined} aria-hidden="true" />
                <TextoApi texto={etiqueta} clave={claveLeyenda(variable, i, etiqueta)} />{color ? '' : ` ${t('origen.leyenda.transparente')}`}
              </li>
            )
          })}
        </ul>
        {unidad && <div className="leyenda__unidad">{unidad}</div>}
      </div>
    )
  }
  const rampa = rampaDePaleta(paleta, variable) ?? 'gris'
  const clavesExtremos = EXTREMOS[paleta]
  const claves = extremos ?? clavesExtremos
  const palabras = claves && [t(claves[0]), t(claves[1])]
  const marcas = formatoMarcas(vmin, vmax, idioma)
  return (
    <div className="leyenda" role="group" aria-label={t('origen.leyenda.titulo_rango', { unidad, desde: marcas[0], hasta: marcas[MARCAS - 1] })}>
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

import type { CapaDto } from '../../api/consultas'
import { decodificarRejilla } from '../../api/rejilla'
import { colorear } from '../../diseno/rampas'
import { aPng } from '../../exportar/png'
import { estiloDeCapa } from './derivados'

const LADO_OBJETIVO = 768

/** PNG de una capa: la rejilla coloreada y ampliada por un factor entero (sin suavizar), más la franja de origen de `aPng`. */
export function pngDeCapa(capa: CapaDto): Promise<Blob> {
  const { rejilla } = capa
  const estilo = estiloDeCapa(capa)
  const imagen = colorear(decodificarRejilla(rejilla), estilo.rampa, estilo.categorias, rejilla.columnas)
  const k = Math.max(1, Math.round(LADO_OBJETIVO / Math.max(rejilla.columnas, rejilla.filas)))
  const chico = document.createElement('canvas')
  chico.width = rejilla.columnas
  chico.height = rejilla.filas
  const c1 = chico.getContext('2d')
  const grande = document.createElement('canvas')
  grande.width = rejilla.columnas * k
  grande.height = rejilla.filas * k
  const c2 = grande.getContext('2d')
  if (!c1 || !c2) return Promise.reject(new Error('No se pudo crear el lienzo de exportación.'))
  c1.putImageData(imagen, 0, 0)
  c2.imageSmoothingEnabled = false
  c2.drawImage(chico, 0, 0, grande.width, grande.height)
  return aPng(grande, capa.origen)
}

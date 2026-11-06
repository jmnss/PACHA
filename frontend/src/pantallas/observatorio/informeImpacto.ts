import type { Impacto } from '../../api/consultas'
import { decodificarRejilla } from '../../api/rejilla'
import { colorear } from '../../diseno/rampas'
import { aPng } from '../../exportar/png'
import { estiloDeCapa } from './derivados'

/** Texto del informe de una página. La línea de aviso va siempre; la franja de origen la añade `aPng`. */
export function lineasInformeImpacto(i: Impacto): string[] {
  return [
    `${i.titulo} · ${i.escenario}`,
    `Pasadas comparadas: ${i.antes} → ${i.despues}`,
    ...i.cifras.map((c) => `${c.etiqueta}: ${c.valor} ${c.unidad}`.trim()),
    ...i.lectura,
    ...i.acciones.map((a) => `· ${a}`),
    ...(i.origen.tipo === 'real' ? [] : ['Ejemplo ilustrativo con datos de demostración: no es una observación real de NISAR.']),
  ]
}

const token = (nombre: string, respaldo: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(nombre).trim() || respaldo

/** Parte `texto` en líneas que quepan en `ancho` con la fuente actual del contexto. */
function envolver(ctx: CanvasRenderingContext2D, texto: string, ancho: number): string[] {
  const lineas: string[] = []
  let actual = ''
  for (const palabra of texto.split(' ')) {
    const prueba = actual ? `${actual} ${palabra}` : palabra
    if (actual && ctx.measureText(prueba).width > ancho) { lineas.push(actual); actual = palabra } else actual = prueba
  }
  lineas.push(actual)
  return lineas
}

/** Informe de una página en PNG: mapa de la capa de impacto, cifras, lectura, acciones y franja de origen. */
export async function generarInformeImpacto(i: Impacto): Promise<Blob> {
  const px = colorear(decodificarRejilla(i.capa.rejilla), estiloDeCapa(i.capa).rampa, estiloDeCapa(i.capa).categorias, i.capa.rejilla.columnas)
  const mapa = document.createElement('canvas')
  mapa.width = px.width
  mapa.height = px.height
  mapa.getContext('2d')?.putImageData(px, 0, 0)

  const ANCHO = 900
  const LADO = 420
  const lienzo = document.createElement('canvas')
  lienzo.width = ANCHO
  const ctx = lienzo.getContext('2d')
  if (!ctx) throw new Error('No se pudo crear el lienzo del informe.')
  const fuente = token('--font-sans', 'sans-serif')
  const lineas = lineasInformeImpacto(i)
  const alturas = lineas.map((l, k) => {
    ctx.font = `${k === 0 ? '600 18px' : '14px'} ${fuente}`
    return envolver(ctx, l, ANCHO - 24).length * 21 + (k === 0 ? 6 : 2)
  })
  lienzo.height = LADO + 24 + alturas.reduce((a, b) => a + b, 0) + 12
  const c = lienzo.getContext('2d')!
  c.fillStyle = token('--ground', 'black')
  c.fillRect(0, 0, lienzo.width, lienzo.height)
  c.imageSmoothingEnabled = false
  c.drawImage(mapa, (ANCHO - LADO) / 2, 12, LADO, LADO)
  c.strokeStyle = token('--control', 'gray')
  c.lineWidth = 1
  c.strokeRect((ANCHO - LADO) / 2 - 0.5, 11.5, LADO + 1, LADO + 1)
  c.fillStyle = token('--text', 'white')
  c.textBaseline = 'top'
  let y = LADO + 24
  lineas.forEach((l, k) => {
    c.font = `${k === 0 ? '600 18px' : '14px'} ${fuente}`
    for (const parte of envolver(c, l, ANCHO - 24)) { c.fillText(parte, 12, y); y += 21 }
    y += k === 0 ? 6 : 2
  })
  return aPng(lienzo, i.origen)
}

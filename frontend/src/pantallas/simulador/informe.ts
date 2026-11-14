import type { EventoDto, MundoDto } from '../../api/simulador'
import { aPng } from '../../exportar/png'
import type { T } from '../../idioma/traductor'
import { etiquetaMetricaTexto, valorMetricaTexto } from '../../idioma/metricaTexto'
import { crearContexto, type ContextoIdioma } from '../../idioma/useT'
import { coordenadas, regionTexto, temporadaTexto, tituloTexto } from './bitacora'

const CTX_ES = crearContexto('es', () => {})

/** Texto del informe de una página (el aviso de simulación va siempre; la franja de origen la añade `aPng`). */
export function lineasInforme(e: EventoDto, m: MundoDto, ctx: ContextoIdioma = CTX_ES): string[] {
  const { t } = ctx
  const temporada = m.temporada ? ` · ${t('sim.informe.temporada', { temporada: temporadaTexto(m.temporada, ctx).toLowerCase() })}` : ''
  return [
    tituloTexto({ titulo: e.titulo, titulo_clave: e.clave_texto ?? null, titulo_valores: e.valores_texto ?? null }, ctx),
    `${coordenadas(e.lat, e.lon, t)} · ${regionTexto(m.region, ctx)}${temporada}`,
    ...e.metricas.slice(0, 5).map((x) => `${etiquetaMetricaTexto(x, ctx)}: ${valorMetricaTexto(x, ctx)}`),
    t('sim.informe.aviso'),
  ]
}

const cargar = (b64: string, t: T) => new Promise<HTMLImageElement>((ok, mal) => {
  const img = new Image()
  img.onload = () => ok(img)
  img.onerror = () => mal(new Error(t('sim.informe.error_imagen')))
  img.src = `data:image/png;base64,${b64}`
})

const token = (nombre: string, respaldo: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(nombre).trim() || respaldo

/** Informe de una página en PNG: relieve, estado final del evento, cifras y la franja de demostración. */
export async function generarInforme(e: EventoDto, m: MundoDto, idioma: ContextoIdioma = CTX_ES): Promise<Blob> {
  const { t } = idioma
  const [relieve, final] = await Promise.all([cargar(m.relieve_png_b64, t), cargar(e.cuadros_png_b64[e.cuadros_png_b64.length - 1], t)])
  const lienzo = document.createElement('canvas')
  const lado = relieve.width
  const lineas = lineasInforme(e, m, idioma)
  lienzo.width = lado
  lienzo.height = lado + 22 * lineas.length + 16
  const ctx = lienzo.getContext('2d')
  if (!ctx) throw new Error(t('sim.informe.error_lienzo'))
  ctx.fillStyle = token('--ground', 'black')
  ctx.fillRect(0, 0, lienzo.width, lienzo.height)
  ctx.drawImage(relieve, 0, 0, lado, lado)
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(final, 0, 0, lado, lado)
  ctx.fillStyle = token('--text', 'white')
  ctx.textBaseline = 'top'
  lineas.forEach((l, i) => {
    ctx.font = `${i === 0 ? '600 16px' : '13px'} ${token('--font-sans', 'sans-serif')}`
    ctx.fillText(l, 12, lado + 12 + i * 22)
  })
  return aPng(lienzo, e.origen, t)
}

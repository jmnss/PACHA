import { useMemo } from 'react'
import type { EventoDto, Herramienta } from '../../api/simulador'
import { clavesApi, valorMetrica } from '../../idioma/clavesApi'
import { useT } from '../../idioma/useT'
import { MomentoAcciones } from './MomentoAcciones'
import { PreguntaIA } from './PreguntaIA'
import { armarPrompt, MOMENTOS, porMomento } from './promptIA'
import type { Valores } from './valores'

interface Props {
  evento: EventoDto
  /** Herramienta del catálogo (etiquetas y unidades de los parámetros). */
  herramienta?: Herramienta
  /** Parámetros con los que se desató el evento. */
  parametros?: Valores
  /** Nombre del lugar del catálogo, si lo hay. */
  lugar?: string
}

/** «Qué hacer»: acciones generales de guías públicas, ordenadas por la gravedad simulada, y el prompt para la IA. */
export function AccionesSugeridas({ evento, herramienta, parametros = {}, lugar }: Props) {
  const { t, textoApi, formatoNumero } = useT()
  const { gravedad, acciones } = evento.acciones
  const nivel = t(`sim.acc.gravedad.${gravedad}` as const)

  const prompt = useMemo(() => {
    const h = evento.herramienta
    const coord = (x: number) => formatoNumero(x, { maximumFractionDigits: 3 })
    const params = (herramienta?.controles ?? []).filter((c) => c.id !== 'semilla' && parametros[c.id] !== undefined).map((c) => {
      const v = parametros[c.id]
      const etiqueta = textoApi(c.etiqueta, clavesApi.simControl(h, c.id, 'etiqueta')).texto
      const valor = typeof v === 'number' ? `${formatoNumero(v * c.escala, { maximumFractionDigits: 2 })}${c.unidad ? ` ${c.unidad}` : ''}`
        : typeof v === 'boolean' ? t(v ? 'sim.acc.prompt.si' : 'sim.acc.prompt.no')
          : c.tipo === 'seleccion' ? textoApi(String(v), clavesApi.simOpcion(h, c.id, String(v))).texto : String(v)
      return `${etiqueta}: ${valor}`
    })
    const metricas = evento.metricas.map((m) => {
      const etiqueta = textoApi(m.etiqueta, clavesApi.metrica(m.clave_texto, 'etiqueta')).texto
      const valor = m.clave_texto ? valorMetrica(m.valor, m.valores_texto, formatoNumero, { mil: t('api.valor.mil'), personas: t('api.valor.personas') }) : m.valor
      return `${etiqueta}: ${valor}`
    })
    const fenomeno = herramienta ? textoApi(herramienta.nombre, clavesApi.simHerramienta(h, 'nombre')).texto : h
    const nombreLugar = lugar ? textoApi(lugar, clavesApi.simMundo(lugar, 'nombre')).texto : t('sim.acc.prompt.lugar_propio')
    return armarPrompt({
      fenomeno, lugar: nombreLugar, lat: coord(evento.lat), lon: coord(evento.lon), parametros: params, metricas, gravedad: nivel,
      acciones: acciones.map((a) => {
        const pq = a.porque_texto
        return {
          momento: t(`sim.acc.momento.${a.momento}` as const),
          texto: `${textoApi(a.texto, a.clave_texto).texto} ${textoApi(a.porque, pq.clave_texto, pq.valores_texto, pq.decimales_texto).texto}`,
          fuente: a.fuente.nombre, url: a.fuente.url,
        }
      }),
    }, t)
  }, [evento, herramienta, parametros, lugar, acciones, nivel, t, textoApi, formatoNumero])

  if (acciones.length === 0) return null
  return (
    <section className="acciones-sugeridas" aria-labelledby="acciones-sugeridas-titulo">
      <h3 id="acciones-sugeridas-titulo" className="acciones-sugeridas__titulo">{t('sim.acc.titulo')}</h3>
      <p className="acciones-sugeridas__aviso">{t('sim.acc.aviso')}</p>
      <p className="acciones-sugeridas__gravedad" data-gravedad={gravedad}>{t('sim.acc.gravedad', { nivel })}</p>
      {MOMENTOS.map((m) => <MomentoAcciones key={m} momento={m} acciones={porMomento(acciones, m)} abierto={m === 'durante'} />)}
      <PreguntaIA prompt={prompt} />
    </section>
  )
}

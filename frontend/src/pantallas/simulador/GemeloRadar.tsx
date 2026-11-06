import type { EventoDto } from '../../api/simulador'
import { Comparador } from '../../comparador/Comparador'
import { Tarjeta } from '../../diseno/Tarjeta'
import { estiloDeCapa } from '../observatorio/derivados'
import { clavesApi } from '../../idioma/clavesApi'
import { EtiquetaMetrica, ValorMetrica } from '../../idioma/MetricaApi'
import { useT } from '../../idioma/useT'
import type { Clave } from '../../idioma/traductor'
import { PanelRadar } from './PanelRadar'

const POR_QUE: Record<string, Clave> = { HV: 'sim.gemelo.por_que_hv', HH: 'sim.gemelo.por_que_hh' }

/**
 * «Gemelo del radar»: lo que vería un radar como NISAR antes y después del evento simulado.
 * Si los dos primeros paneles comparten escala se comparan con el deslizante; si no, van en rejilla.
 */
export function GemeloRadar({ evento }: { evento: EventoDto }) {
  const { t, textoApi } = useT()
  const [a, d, ...resto] = evento.paneles
  // Títulos que escribe modelo/desastres.py: traducidos por su clave derivada si el español coincide.
  const trad = evento.titulos_paneles.map((x) => textoApi(x, clavesApi.simPanel(x)))
  const tit = trad.map((r) => r.texto)
  const propio = (k: number) => trad[k]?.traducido ?? false
  const comparar = evento.comparable && a && d
  const restantes = comparar ? resto.map((p, k) => [p, tit[k + 2], propio(k + 2)] as const) : evento.paneles.map((p, k) => [p, tit[k], propio(k)] as const)
  const estilo = a ? estiloDeCapa(a) : null
  return (
    <Tarjeta titulo={t('sim.gemelo.titulo')}>
      <p className="simulador__nota">{t('sim.gemelo.nota')}</p>
      {comparar && estilo && (
        <>
          <Comparador antes={a.rejilla} despues={d.rejilla} rampa={estilo.rampa} categorias={estilo.categorias}
            etiquetaAntes={tit[0]} etiquetaDespues={tit[1]} titulo={`σ⁰ ${evento.polarizacion ?? ''}, ${a.unidad}`.trim()}
            origen={a.origen} origenDespues={d.origen} unidad={a.unidad} variable={a.variable} leyenda={a.leyenda} />
          {evento.polarizacion && POR_QUE[evento.polarizacion] && <p className="simulador__nota">{t(POR_QUE[evento.polarizacion])}</p>}
        </>
      )}
      <div className="rejilla-paneles">
        {restantes.map(([p, titulo, yaTraducido]) => <PanelRadar key={p.variable} capa={p} titulo={titulo ?? p.variable} propio={yaTraducido} />)}
      </div>
      {evento.metricas_radar.length > 0 && (
        <ul className="simulador__chips" aria-label={t('sim.gemelo.deteccion_aria')}>
          {evento.metricas_radar.map((m) => <li key={m.etiqueta}><EtiquetaMetrica m={m} />: <span className="num"><ValorMetrica m={m} /></span></li>)}
        </ul>
      )}
    </Tarjeta>
  )
}

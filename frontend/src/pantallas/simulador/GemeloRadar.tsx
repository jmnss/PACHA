import type { EventoDto } from '../../api/simulador'
import { Comparador } from '../../comparador/Comparador'
import { Tarjeta } from '../../diseno/Tarjeta'
import { estiloDeCapa } from '../observatorio/derivados'
import { PanelRadar } from './PanelRadar'

const POR_QUE: Record<string, string> = {
  HV: 'La polarización HV (emite en horizontal y recibe en vertical) responde a la estructura del dosel y a su biomasa: se oscurece donde el fuego consume la vegetación.',
  HH: 'La polarización HH responde con fuerza al agua abierta, que se ve oscura por la reflexión especular, y a la vegetación inundada, que se ve brillante por el doble rebote.',
}

/**
 * «Gemelo del radar»: lo que vería un radar como NISAR antes y después del evento simulado.
 * Si los dos primeros paneles comparten escala se comparan con el deslizante; si no, van en rejilla.
 */
export function GemeloRadar({ evento }: { evento: EventoDto }) {
  const [a, d, ...resto] = evento.paneles
  const t = evento.titulos_paneles
  const comparar = evento.comparable && a && d
  const restantes = comparar ? resto.map((p, k) => [p, t[k + 2]] as const) : evento.paneles.map((p, k) => [p, t[k]] as const)
  const estilo = a ? estiloDeCapa(a) : null
  return (
    <Tarjeta titulo="Lo que vería un radar como NISAR">
      <p className="simulador__nota">
        Es una simulación de un radar como NISAR sobre el evento simulado, no una observación. Desliza el divisor para pasar de «antes» a «después».
      </p>
      {comparar && estilo && (
        <>
          <Comparador antes={a.rejilla} despues={d.rejilla} rampa={estilo.rampa} categorias={estilo.categorias}
            etiquetaAntes={t[0]} etiquetaDespues={t[1]} titulo={`σ⁰ ${evento.polarizacion ?? ''}, ${a.unidad}`.trim()}
            origen={a.origen} origenDespues={d.origen} unidad={a.unidad} variable={a.variable} leyenda={a.leyenda} />
          {evento.polarizacion && POR_QUE[evento.polarizacion] && <p className="simulador__nota">{POR_QUE[evento.polarizacion]}</p>}
        </>
      )}
      <div className="rejilla-paneles">
        {restantes.map(([p, titulo]) => <PanelRadar key={p.variable} capa={p} titulo={titulo ?? p.variable} />)}
      </div>
      {evento.metricas_radar.length > 0 && (
        <ul className="simulador__chips" aria-label="Detección del radar frente a la verdad sintética">
          {evento.metricas_radar.map((m) => <li key={m.etiqueta}>{m.etiqueta}: <span className="num">{m.valor}</span></li>)}
        </ul>
      )}
    </Tarjeta>
  )
}

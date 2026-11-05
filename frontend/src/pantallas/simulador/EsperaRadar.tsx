import type { EventoDto } from '../../api/simulador'
import { Barras } from '../../graficos/Barras'
import { Tarjeta } from '../../diseno/Tarjeta'
import type { Origen } from '../../diseno/origen'

const dias = new Intl.NumberFormat('es-EC', { maximumFractionDigits: 1 })

/** «¿Cuándo lo vería NISAR?»: espera hasta la primera imagen con un ciclo de repetición supuesto. */
export function EsperaRadar({ espera, origen }: { espera: EventoDto['espera_radar']; origen: Origen }) {
  const { ciclo_dias: ciclo, minimo_dias: min, maximo_dias: max, medio_dias: medio, duracion_evento_h: dur } = espera
  const datos = [
    ...(dur !== null ? [{ etiqueta: 'Duración del evento', corta: 'Evento', valor: dur }] : []),
    { etiqueta: 'Espera media hasta la primera imagen', corta: 'Espera media', valor: medio * 24 },
    { etiqueta: 'Espera máxima hasta la primera imagen', corta: 'Espera máx.', valor: max * 24 },
  ]
  return (
    <Tarjeta titulo="¿Cuándo lo vería el radar?">
      <p className="simulador__nota">
        Con un ciclo de repetición supuesto de {ciclo} días ({espera.verificado ? 'verificado' : 'pendiente de confirmar con la documentación oficial'}),
        un radar como NISAR tardaría entre {min} y {max} días en volver a pasar por este lugar; en promedio, {dias.format(medio)} días.
        {dur === null
          ? ' Este evento es instantáneo: la imagen siempre llega después de que ocurre.'
          : ` Este evento dura ${dias.format(dur)} h: ${dur < medio * 24 ? 'lo más probable es que ocurra y termine antes de la primera imagen' : 'la primera imagen podría llegar durante el evento'}.`}
      </p>
      <Barras datos={datos} unidad="h" origen={origen} titulo="Duración del evento y espera hasta la primera imagen (horas)" alto={200} />
    </Tarjeta>
  )
}

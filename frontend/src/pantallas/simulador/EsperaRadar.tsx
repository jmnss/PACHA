import type { EventoDto } from '../../api/simulador'
import { Barras } from '../../graficos/Barras'
import { Tarjeta } from '../../diseno/Tarjeta'
import type { Origen } from '../../diseno/origen'
import { useT } from '../../idioma/useT'

/** «¿Cuándo lo vería NISAR?»: espera hasta la primera imagen con un ciclo de repetición supuesto. */
export function EsperaRadar({ espera, origen }: { espera: EventoDto['espera_radar']; origen: Origen }) {
  const { t, formatoNumero } = useT()
  const { ciclo_dias: ciclo, minimo_dias: min, maximo_dias: max, medio_dias: medio, duracion_evento_h: dur } = espera
  const dias = (n: number) => formatoNumero(n, { maximumFractionDigits: 1 })
  const datos = [
    ...(dur !== null ? [{ etiqueta: t('sim.espera.duracion'), corta: t('sim.espera.duracion_corta'), valor: dur }] : []),
    { etiqueta: t('sim.espera.media'), corta: t('sim.espera.media_corta'), valor: medio * 24 },
    { etiqueta: t('sim.espera.maxima'), corta: t('sim.espera.maxima_corta'), valor: max * 24 },
  ]
  const intro = t(espera.verificado ? 'sim.espera.intro_verificado' : 'sim.espera.intro_pendiente', { ciclo: dias(ciclo), min: dias(min), max: dias(max), medio: dias(medio) })
  const final = dur === null
    ? t('sim.espera.instantaneo')
    : t(dur < medio * 24 ? 'sim.espera.dura_antes' : 'sim.espera.dura_durante', { dur: dias(dur) })
  return (
    <Tarjeta titulo={t('sim.espera.titulo')}>
      <p className="simulador__nota">{intro} {final}</p>
      <Barras datos={datos} unidad="h" origen={origen} titulo={t('sim.espera.grafico')} alto={200} />
    </Tarjeta>
  )
}

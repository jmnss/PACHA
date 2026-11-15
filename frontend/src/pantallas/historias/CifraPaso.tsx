import { SelloOrigen } from '../../diseno/SelloOrigen'
import { UnidadMetrica, ValorMetrica } from '../../idioma/MetricaApi'
import { useT } from '../../idioma/useT'
import { formatearFecha } from '../../tiempo/fechas'
import type { Cifra } from './cifras'

/** La cifra visible de un paso, con su rótulo y su sello de origen (docs/diseno.md §8, KPI). */
export function CifraPaso({ cifra, rotulo }: { cifra: Cifra | null; rotulo: string }) {
  const { t, idioma, formatoNumero } = useT()
  const fecha = cifra?.tipo === 'serie' ? formatearFecha(cifra.instante, idioma) ?? '—' : ''
  const etiqueta = rotulo.replace('{fecha}', fecha)

  let valor
  if (cifra === null) valor = <span className="cifra-paso__pendiente">{t('historias.cifra.calculando')}</span>
  else if (cifra.tipo === 'por_llegar') valor = <span className="por-llegar__chip">{t('historias.por_llegar')}</span>
  else if (cifra.tipo === 'sin_dato') valor = '—'
  else if (cifra.tipo === 'pasadas') valor = t('historias.cifra.pasadas', { n: cifra.n })
  else if (cifra.tipo === 'serie') valor = `${formatoNumero(cifra.valor, { maximumFractionDigits: 2 })} ${cifra.unidad}`
  else valor = <><ValorMetrica m={cifra.metrica} /> <UnidadMetrica unidad={cifra.unidad} /></>

  return (
    <div className="cifra-paso">
      <p className="cifra-paso__rotulo">{etiqueta}</p>
      <p className="cifra-paso__valor">{valor}</p>
      {cifra && 'origen' in cifra && <SelloOrigen origen={cifra.origen} />}
    </div>
  )
}

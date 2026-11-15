import { SelloOrigen } from '../../diseno/SelloOrigen'
import { useT } from '../../idioma/useT'
import { formatearFecha } from '../../tiempo/fechas'
import type { Cifra } from './cifras'

/** La cifra visible de un paso, con su rótulo y su sello de origen o su fuente (docs/diseno.md §8, KPI). */
export function CifraPaso({ cifra, rotulo, pol }: { cifra: Cifra | null | undefined; rotulo: string; pol?: string }) {
  const { t, idioma, formatoNumero } = useT()
  if (cifra === undefined || !rotulo) return null
  const fecha = cifra?.fecha ? formatearFecha(cifra.fecha, idioma) ?? '—' : ''
  const etiqueta = rotulo.replace('{fecha}', fecha).replace('{pol}', pol ?? '')

  let valor
  if (cifra === null) valor = <span className="cifra-paso__pendiente">{t('historias.cifra.calculando')}</span>
  else if (cifra.valor === null) valor = '—'
  else if (cifra.esFecha) valor = formatearFecha(String(cifra.valor), idioma) ?? String(cifra.valor)
  else if (typeof cifra.valor === 'number') {
    const n = formatoNumero(cifra.valor, { minimumFractionDigits: cifra.decimales ?? 0, maximumFractionDigits: cifra.decimales ?? 2 })
    valor = `${n}${cifra.unidad ? ` ${cifra.unidad}` : ''}`
  } else valor = cifra.valor

  return (
    <div className="cifra-paso">
      <p className="cifra-paso__rotulo">{etiqueta}</p>
      <p className="cifra-paso__valor">{valor}</p>
      {cifra?.origen && <SelloOrigen origen={cifra.origen} />}
      {cifra?.fuente && (
        <p className="cifra-paso__fuente">
          {t('historias.ficha.fuente')}: <a href={cifra.fuente.url} target="_blank" rel="noopener noreferrer" title={cifra.fuente.cita}>{cifra.fuente.nombre}</a>
        </p>
      )}
    </div>
  )
}

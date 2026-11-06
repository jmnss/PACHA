import { useNubes } from '../../api/laboratorio'
import { Cargando, ErrorBloque } from '../../diseno/Estados'
import { Deslizador } from '../../diseno/Deslizador'
import { FranjaKpi } from '../../diseno/FranjaKpi'
import { SelloOrigen } from '../../diseno/SelloOrigen'
import { Tarjeta } from '../../diseno/Tarjeta'
import { Termino } from '../../diseno/Termino'
import { PanelRadar } from '../simulador/PanelRadar'
import { mensajeDeError } from '../../api/cliente'
import { EtiquetaMetrica, ValorMetrica } from '../../idioma/MetricaApi'
import { useT } from '../../idioma/useT'

interface Props { cobertura: number; onCobertura: (n: number) => void }

/** Misma inundación vista por un satélite óptico y por un radar, con nubes ajustables sobre la imagen óptica. */
export function VistaNubes({ cobertura, onCobertura }: Props) {
  const { t, formatoNumero } = useT()
  const q = useNubes(cobertura)
  if (q.isPending) return <Cargando texto={t('lab.comun.preparando')} filas={4} />
  if (q.isError) return <ErrorBloque mensaje={mensajeDeError(q.error, t)} onReintentar={() => void q.refetch()} />
  const d = q.data
  return (
    <div className="laboratorio">
      <Tarjeta titulo={t('lab.nubes.ajusta')} pie={<SelloOrigen origen={d.origen} />}>
        <Deslizador
          etiqueta={t('lab.nubes.cobertura')}
          valorTexto={`${formatoNumero(cobertura)} %`}
          min={0} max={100} step={10} value={cobertura}
          onChange={(e) => onCobertura(Number(e.target.value))}
          limite={t('lab.nubes.limite')}
        />
        <FranjaKpi items={d.metricas.map((m, k) => ({ etiqueta: <EtiquetaMetrica m={m} />, valor: <ValorMetrica m={m} />, unidad: m.unidad, principal: k === 0 }))} />
      </Tarjeta>
      <div className="laboratorio__rejilla">
        <PanelRadar capa={d.optico} titulo={t('lab.nubes.optico')} propio />
        <PanelRadar capa={d.radar} titulo={t('lab.nubes.radar')} propio />
        <PanelRadar capa={d.cambio_optico} titulo={t('lab.nubes.cambio_optico')} propio />
        <PanelRadar capa={d.cambio_radar} titulo={t('lab.nubes.cambio_radar')} propio />
      </div>
      <Tarjeta titulo={t('lab.nubes.explica_titulo')}>
        <p className="laboratorio__texto">
          {t('lab.nubes.explica_antes')}<Termino nombre={t('lab.nubes.activo')} explicacion={t('lab.nubes.activo_explicacion')} />{t('lab.nubes.explica_despues')}
        </p>
        <p className="laboratorio__nota">
          {t('lab.nubes.nota')}
        </p>
      </Tarjeta>
    </div>
  )
}

import { useState } from 'react'
import { mensajeDeError } from '../../api/cliente'
import { TextoApi } from '../../idioma/TextoApi'
import { useT } from '../../idioma/useT'
import { useImpacto, type Escenario } from '../../api/consultas'
import { Boton } from '../../diseno/Boton'
import { Cargando, ErrorBloque } from '../../diseno/Estados'
import { FranjaKpi } from '../../diseno/FranjaKpi'
import { IconoDescargar } from '../../diseno/iconos'
import { SelloOrigen } from '../../diseno/SelloOrigen'
import { Tarjeta } from '../../diseno/Tarjeta'
import { descargarPng } from '../../exportar/png'
import { Barras } from '../../graficos/Barras'
import { Linea } from '../../graficos/Linea'
import { PanelRadar } from '../simulador/PanelRadar'
import { generarInformeImpacto } from './informeImpacto'

interface Props { esc: Escenario; antesId: string; despuesId: string; polarizacion?: string }

/** Impacto en hectáreas, su evolución, una lectura en lenguaje llano y un informe de una página. */
export function VistaImpacto({ esc, antesId, despuesId, polarizacion }: Props) {
  // El incendio se lee en la polarización cruzada (HV), como en su historia.
  const pol = esc.historia === 'incendio' && esc.polarizaciones.includes('HV') ? 'HV' : polarizacion
  const q = useImpacto(esc.id, antesId, despuesId, pol)
  const [aviso, setAviso] = useState<string | null>(null)
  const { t } = useT()
  if (antesId === despuesId) return <p className="observatorio__aviso">{t('obs.impacto.elige_dos')}</p>
  if (q.isPending) return <Cargando texto={t('obs.impacto.calculando')} filas={4} />
  if (q.isError) return <ErrorBloque mensaje={mensajeDeError(q.error, t)} onReintentar={() => void q.refetch()} />
  const d = q.data

  const descargar = async () => {
    setAviso(null)
    try {
      descargarPng(`impacto_${esc.id}_${antesId}_${despuesId}.png`, await generarInformeImpacto(d, t))
    } catch (e) {
      setAviso(e instanceof Error ? e.message : t('obs.impacto.error_informe'))
    }
  }

  return (
    <div className="impacto">
      <Tarjeta titulo={<TextoApi texto={d.titulo} />} pie={<SelloOrigen origen={d.origen} />}>
        <FranjaKpi items={d.cifras.map((c, k) => ({ etiqueta: <TextoApi texto={c.etiqueta} />, valor: <TextoApi texto={c.valor} />, unidad: c.unidad, principal: k === 0 }))} />
        {d.lectura.map((x) => <p key={x} className="impacto__texto"><TextoApi texto={x} /></p>)}
        <div className="impacto__acciones">
          <Boton variante="primario" icono={<IconoDescargar />} onClick={() => void descargar()}>{t('obs.impacto.descargar')}</Boton>
        </div>
        {aviso && <p className="observatorio__aviso" role="alert">{aviso}</p>}
      </Tarjeta>
      <div className="impacto__rejilla">
        <PanelRadar capa={d.capa} titulo={t('obs.impacto.donde', { antes: d.antes, despues: d.despues })} />
        <Tarjeta titulo={t('obs.impacto.hectareas')}>
          <Barras datos={d.categorias.map((c) => ({ etiqueta: c.etiqueta, corta: c.etiqueta.replace(/\s*\(.*\)/, ''), valor: Math.round(c.ha) }))} unidad="ha" origen={d.origen} />
        </Tarjeta>
      </div>
      {d.evolucion.length > 1 && (
        <Tarjeta titulo={t('obs.impacto.evolucion')}>
          <Linea series={[{ nombre: d.titulo, puntos: d.evolucion.map((p) => [p.instante, p.ha]) }]} unidad="ha" origen={d.origen} />
        </Tarjeta>
      )}
      <Tarjeta titulo={t('obs.impacto.acciones')}>
        <ul className="impacto__lista">{d.acciones.map((a) => <li key={a}><TextoApi texto={a} /></li>)}</ul>
        {d.notas.map((n) => <p key={n} className="impacto__nota"><TextoApi texto={n} /></p>)}
      </Tarjeta>
    </div>
  )
}

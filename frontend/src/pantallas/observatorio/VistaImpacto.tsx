import { useState } from 'react'
import { mensajeDeError } from '../../api/cliente'
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
  if (antesId === despuesId) return <p className="observatorio__aviso">Elige dos pasadas distintas para resumir el impacto.</p>
  if (q.isPending) return <Cargando texto="Calculando el impacto…" filas={4} />
  if (q.isError) return <ErrorBloque mensaje={mensajeDeError(q.error)} onReintentar={() => void q.refetch()} />
  const d = q.data

  const descargar = async () => {
    setAviso(null)
    try {
      descargarPng(`impacto_${esc.id}_${antesId}_${despuesId}.png`, await generarInformeImpacto(d))
    } catch (e) {
      setAviso(e instanceof Error ? e.message : 'No se pudo generar el informe.')
    }
  }

  return (
    <div className="impacto">
      <Tarjeta titulo={d.titulo} pie={<SelloOrigen origen={d.origen} />}>
        <FranjaKpi items={d.cifras.map((c, k) => ({ etiqueta: c.etiqueta, valor: c.valor, unidad: c.unidad, principal: k === 0 }))} />
        {d.lectura.map((t) => <p key={t} className="impacto__texto">{t}</p>)}
        <div className="impacto__acciones">
          <Boton variante="primario" icono={<IconoDescargar />} onClick={() => void descargar()}>Descargar informe (PNG)</Boton>
        </div>
        {aviso && <p className="observatorio__aviso" role="alert">{aviso}</p>}
      </Tarjeta>
      <div className="impacto__rejilla">
        <PanelRadar capa={d.capa} titulo={`Dónde: ${d.antes} → ${d.despues}`} />
        <Tarjeta titulo="Hectáreas por categoría">
          <Barras datos={d.categorias.map((c) => ({ etiqueta: c.etiqueta, corta: c.etiqueta.replace(/\s*\(.*\)/, ''), valor: Math.round(c.ha) }))} unidad="ha" origen={d.origen} />
        </Tarjeta>
      </div>
      {d.evolucion.length > 1 && (
        <Tarjeta titulo="Evolución frente a la pasada «antes»">
          <Linea series={[{ nombre: d.titulo, puntos: d.evolucion.map((p) => [p.instante, p.ha]) }]} unidad="ha" origen={d.origen} />
        </Tarjeta>
      )}
      <Tarjeta titulo="Qué podría hacerse con esto">
        <ul className="impacto__lista">{d.acciones.map((a) => <li key={a}>{a}</li>)}</ul>
        {d.notas.map((n) => <p key={n} className="impacto__nota">{n}</p>)}
      </Tarjeta>
    </div>
  )
}

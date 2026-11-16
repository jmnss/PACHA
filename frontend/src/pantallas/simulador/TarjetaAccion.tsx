import type { EventoDto } from '../../api/simulador'
import { textoClave } from '../../idioma/clavesApi'
import { TextoApi } from '../../idioma/TextoApi'
import { useT } from '../../idioma/useT'

type Accion = EventoDto['acciones']['acciones'][number]

/** Una acción sugerida: qué hacer, por qué en una frase y la guía pública de la que sale (con su cita literal). */
export function TarjetaAccion({ accion }: { accion: Accion }) {
  const { t, formatoFecha } = useT()
  const porque = textoClave(accion.porque_texto)
  const f = accion.fuente
  return (
    <li className="accion" data-prioridad={accion.prioridad}>
      <p className="accion__texto">
        {accion.prioridad === 'alta' && <span className="accion__prioridad">{t('sim.acc.prioritaria')}</span>}
        <TextoApi texto={accion.texto} clave={accion.clave_texto} />
      </p>
      <p className="accion__porque">
        <TextoApi texto={accion.porque} clave={porque.clave} valores={porque.valores} decimales={porque.decimales} />
      </p>
      <p className="accion__fuente">
        {t('sim.acc.fuente')}{' '}
        <a href={f.url} target="_blank" rel="noopener noreferrer">{f.nombre}</a>
        {' · '}{t('sim.acc.consultada', { fecha: formatoFecha(f.consultado, 'larga') })}
        <q className="accion__cita" lang={f.idioma}>{f.cita}</q>
      </p>
    </li>
  )
}

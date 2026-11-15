import type { Herramienta } from '../../api/simulador'
import { clavesApi } from '../../idioma/clavesApi'
import { TextoApi } from '../../idioma/TextoApi'
import type { Clave } from '../../idioma/traductor'
import { useT } from '../../idioma/useT'
import { FENOMENOS } from './fenomenos'
import { IconoFenomeno } from './IconoFenomeno'

interface Props {
  herramientas: Herramienta[]
  onElegir: (id: string) => void
}

/** Paso 1: tarjetas grandes, una por fenómeno. */
export function ElegirFenomeno({ herramientas, onElegir }: Props) {
  const { t } = useT()
  const lista = FENOMENOS.map((id) => herramientas.find((h) => h.id === id)).filter((h): h is Herramienta => !!h)
  return (
    <section className="fenomenos" aria-labelledby="fenomenos-titulo">
      <h2 id="fenomenos-titulo" className="fenomenos__titulo">{t('sim.fenomeno.titulo')}</h2>
      <ul className="fenomenos__lista">
        {lista.map((h) => (
          <li key={h.id}>
            <button type="button" className="fenomeno" onClick={() => onElegir(h.id)}>
              <IconoFenomeno id={h.id} />
              <span className="fenomeno__nombre"><TextoApi texto={h.nombre} clave={clavesApi.simHerramienta(h.id, 'nombre')} /></span>
              <span className="fenomeno__desc">{t(`sim.fenomeno.${h.id}` as Clave)}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

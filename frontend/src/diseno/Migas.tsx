import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { useEscenario } from '../api/consultas'
import { clavesApi } from '../idioma/clavesApi'
import { useT } from '../idioma/useT'
import { HISTORIAS, historiasDe } from '../pantallas/historias/contenido'

interface Miga { texto: string; a?: string }

/** Escenario del Observatorio: el nombre llega de la API; mientras no llega (o si falla) la miga se queda en «Observatorio». */
function useNombreEscenario(activo: boolean, id: string): string | null {
  const { textoApi } = useT()
  const esc = useEscenario(activo ? id : undefined)
  return esc.data ? textoApi(esc.data.nombre, clavesApi.escenario(esc.data.id, 'sitio')).texto : null
}

/** Migas de pan de Explorar: «Explorar › Historias › Embalses y lluvia › Paso 2» o «Explorar › Observatorio › <escenario>». */
export function Migas() {
  const { t, idioma } = useT()
  const { pathname } = useLocation()
  const [params] = useSearchParams()
  const enObservatorio = pathname.endsWith('/observatorio')
  const nombreEsc = useNombreEscenario(enObservatorio, params.get('escenario') ?? 'embalse-mazar')

  const migas: Miga[] = [{ texto: t('estructura.sub.explorar'), a: '/explorar/historias' }]
  if (enObservatorio) {
    migas.push({ texto: t('estructura.sub.observatorio'), a: nombreEsc ? '/explorar/observatorio' : undefined })
    if (nombreEsc) migas.push({ texto: nombreEsc })
  } else {
    const historias = historiasDe(idioma)
    const hist = params.get('historia') ?? HISTORIAS[0].clave
    const h = historias.find((x) => x.clave === hist) ?? historias[0]
    const paso = Number(params.get('paso') ?? '1')
    migas.push({ texto: t('estructura.sub.historias'), a: '/explorar/historias' })
    migas.push({ texto: h.etiqueta, a: paso > 1 ? `/explorar/historias?historia=${h.clave}` : undefined })
    if (paso > 1) migas.push({ texto: t('estructura.miga.paso', { n: paso }) })
  }
  return (
    <nav className="migas" aria-label={t('estructura.migas')}>
      <ol className="migas__lista">
        {migas.map((m, i) => (
          <li key={i} className="migas__item">
            {m.a ? <Link to={m.a}>{m.texto}</Link> : <span aria-current={i === migas.length - 1 ? 'page' : undefined}>{m.texto}</span>}
          </li>
        ))}
      </ol>
    </nav>
  )
}

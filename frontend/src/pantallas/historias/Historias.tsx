import { Link } from 'react-router-dom'
import { mensajeDeError } from '../../api/cliente'
import { useEscenarios } from '../../api/consultas'
import { CabeceraPantalla } from '../../diseno/CabeceraPantalla'
import { ControlSegmentado } from '../../diseno/ControlSegmentado'
import { Cargando, ErrorBloque, Vacio } from '../../diseno/Estados'
import { useEstadoUrl, type Esquema } from '../../estado/useEstadoUrl'
import { useTituloPagina } from '../../estado/useTituloPagina'
import { useT } from '../../idioma/useT'
import { HISTORIAS, historiasDe } from './contenido'
import { PASOS } from './contenido/tipos'
import { Historia } from './Historia'
import './historias.css'

/**
 * Estado en la URL: `historia` (embalses | incendio), `sitio` (mazar | daule-peripa; solo embalses), `paso` (1–4),
 * `pol` (HH | HV; vacío = la recomendada) y `pasada` (índice de la pasada «después»; 0 = la pareja automática).
 */
const ESQUEMA = {
  historia: { tipo: 'enum', valores: HISTORIAS.map((h) => h.clave), porDefecto: HISTORIAS[0].clave },
  sitio: { tipo: 'string', porDefecto: '' },
  paso: { tipo: 'number', porDefecto: 1, min: 1, max: PASOS.length },
  pol: { tipo: 'enum', valores: ['', 'HH', 'HV'], porDefecto: '' },
  pasada: { tipo: 'number', porDefecto: 0, min: 0, max: 9999 },
} as const satisfies Esquema

/** Ruta `/explorar/historias`: las dos historias sobre los escenarios del equipo, como recorrido por pasos. */
export default function Historias() {
  const { t, idioma } = useT()
  useTituloPagina('titulos.historias')
  const [url, cambiar] = useEstadoUrl(ESQUEMA)
  const escenarios = useEscenarios()
  const historias = historiasDe(idioma)
  const contenido = historias.find((h) => h.clave === url.historia) ?? historias[0]
  const sitio = contenido.sitios.includes(url.sitio) ? url.sitio : contenido.sitios[0]
  const deLaHistoria = escenarios.data?.filter((e) => e.historia === contenido.historiaApi && e.sitio && contenido.sitios.includes(e.sitio)) ?? []
  const esc = deLaHistoria.find((e) => e.sitio === sitio)

  const indice = (
    <nav className="historias__indice" aria-label={t('historias.indice.etiqueta')}>
      {historias.map((h, i) => {
        const activa = h.clave === contenido.clave
        return (
          <Link
            key={h.clave}
            to={i === 0 ? '/explorar/historias' : `/explorar/historias?historia=${h.clave}`}
            className={`historias__enlace${activa ? ' historias__enlace--activa' : ''}`}
            aria-current={activa ? 'page' : undefined}
          >
            <span className="historias__enlace-titulo">{h.etiqueta}</span>
            <span className="historias__enlace-resumen">{h.resumen}</span>
          </Link>
        )
      })}
    </nav>
  )

  // Embalses: elegir el sitio (los nombres salen de la API). Incendio: el evento real, sin fecha y sin fuente aún.
  const cabecera = contenido.clave === 'embalses' ? (
    deLaHistoria.length > 1 ? (
      <ControlSegmentado
        etiqueta={t('historias.sitio.etiqueta')}
        opciones={contenido.sitios.flatMap((s) => {
          const e = deLaHistoria.find((x) => x.sitio === s)
          return e ? [{ id: s, etiqueta: e.nombre }] : []
        })}
        valor={sitio}
        onCambiar={(s) => cambiar({ sitio: s === contenido.sitios[0] ? '' : s, paso: url.paso, pol: '', pasada: 0 })}
      />
    ) : null
  ) : (
    <p className="historia__evento-real">{t('historias.evento_real')}</p>
  )

  let cuerpo
  if (escenarios.isPending) cuerpo = <Cargando texto={t('historias.cargando')} filas={4} />
  else if (escenarios.isError) {
    cuerpo = <ErrorBloque mensaje={mensajeDeError(escenarios.error, t)} onReintentar={() => void escenarios.refetch()} />
  } else if (!esc) {
    cuerpo = <Vacio titulo={t('historias.sin_escenario.titulo')} texto={t('historias.sin_escenario.texto')} />
  } else {
    cuerpo = (
      <Historia
        key={esc.id} contenido={contenido} esc={esc} cabecera={cabecera}
        estado={{ paso: url.paso, pol: url.pol, pasada: url.pasada }} cambiar={(p) => cambiar(p)}
      />
    )
  }

  return (
    <>
      <CabeceraPantalla titulo={t('historias.indice.etiqueta')} hallazgo={t('historias.pregunta')} />
      {indice}
      {cuerpo}
      <footer className="historias__creditos">{t('historias.creditos')}</footer>
    </>
  )
}

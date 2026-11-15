import { Link } from 'react-router-dom'
import { mensajeDeError } from '../../api/cliente'
import { useEscenarios } from '../../api/consultas'
import { CabeceraPantalla } from '../../diseno/CabeceraPantalla'
import { Cargando, ErrorBloque, Vacio } from '../../diseno/Estados'
import { useEstadoUrl, type Esquema } from '../../estado/useEstadoUrl'
import { useTituloPagina } from '../../estado/useTituloPagina'
import { useT } from '../../idioma/useT'
import { HISTORIAS, historiasDe } from './contenido'
import { Historia } from './Historia'
import './historias.css'

const ESQUEMA = {
  historia: { tipo: 'enum', valores: HISTORIAS.map((h) => h.clave), porDefecto: HISTORIAS[0].clave },
} as const satisfies Esquema

/** Ruta `/`: índice de las dos historias y la elegida en pantalla. Los escenarios se descubren por su campo `historia`. */
export default function Historias() {
  const { t, idioma } = useT()
  useTituloPagina('titulos.historias')
  const [url] = useEstadoUrl(ESQUEMA)
  const escenarios = useEscenarios()
  const historias = historiasDe(idioma)
  const contenido = historias.find((h) => h.clave === url.historia) ?? historias[0]
  const esc = escenarios.data?.find((e) => e.historia === contenido.clave)

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
            <span className="historias__enlace-titulo" data-contenido-largo>
              {i === 0 ? t('historias.indice.principal', { etiqueta: h.etiqueta }) : h.etiqueta}
            </span>
            <span className="historias__enlace-resumen" data-contenido-largo>{h.resumen}</span>
          </Link>
        )
      })}
    </nav>
  )

  let cuerpo
  if (escenarios.isPending) cuerpo = <Cargando texto={t('historias.cargando')} filas={4} />
  else if (escenarios.isError) {
    cuerpo = <ErrorBloque mensaje={mensajeDeError(escenarios.error, t)} onReintentar={() => void escenarios.refetch()} />
  } else if (!esc) {
    cuerpo = <Vacio titulo={t('historias.sin_escenario.titulo')} texto={t('historias.sin_escenario.texto')} />
  } else cuerpo = <Historia key={esc.id} contenido={contenido} esc={esc} indice={indice} />

  return (
    <>
      <CabeceraPantalla titulo="PACHA" hallazgo={t('historias.pregunta')} />
      {esc ? null : indice}
      {cuerpo}
      <footer className="historias__creditos">{t('historias.creditos')}</footer>
    </>
  )
}

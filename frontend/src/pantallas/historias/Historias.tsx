import { Link } from 'react-router-dom'
import { ErrorApi, MENSAJE_RED } from '../../api/cliente'
import { useEscenarios } from '../../api/consultas'
import { CabeceraPantalla } from '../../diseno/CabeceraPantalla'
import { Cargando, ErrorBloque, Vacio } from '../../diseno/Estados'
import { useEstadoUrl, type Esquema } from '../../estado/useEstadoUrl'
import { HISTORIAS } from './contenido'
import { Historia } from './Historia'
import './historias.css'

const ESQUEMA = {
  historia: { tipo: 'enum', valores: HISTORIAS.map((h) => h.clave), porDefecto: HISTORIAS[0].clave },
} as const satisfies Esquema

const PREGUNTA = 'Qué ve el radar cuando el agua sube o el bosque arde, y por qué.'

/** Ruta `/`: índice de las dos historias y la elegida en pantalla. Los escenarios se descubren por su campo `historia`. */
export default function Historias() {
  const [url] = useEstadoUrl(ESQUEMA)
  const escenarios = useEscenarios()
  const contenido = HISTORIAS.find((h) => h.clave === url.historia) ?? HISTORIAS[0]
  const esc = escenarios.data?.find((e) => e.historia === contenido.clave)

  const indice = (
    <nav className="historias__indice" aria-label="Historias">
      {HISTORIAS.map((h, i) => {
        const activa = h.clave === contenido.clave
        return (
          <Link
            key={h.clave}
            to={i === 0 ? '/' : `/?historia=${h.clave}`}
            className={`historias__enlace${activa ? ' historias__enlace--activa' : ''}`}
            aria-current={activa ? 'page' : undefined}
          >
            <span className="historias__enlace-titulo">{h.etiqueta}{i === 0 ? ' · historia principal' : ''}</span>
            <span className="historias__enlace-resumen">{h.resumen}</span>
          </Link>
        )
      })}
    </nav>
  )

  let cuerpo
  if (escenarios.isPending) cuerpo = <Cargando texto="Cargando la historia…" filas={4} />
  else if (escenarios.isError) {
    cuerpo = <ErrorBloque mensaje={escenarios.error instanceof ErrorApi ? escenarios.error.mensaje : MENSAJE_RED} onReintentar={() => void escenarios.refetch()} />
  } else if (!esc) {
    cuerpo = <Vacio titulo="Esta historia no tiene escenario" texto="No hay un escenario de demostración asociado a esta historia." />
  } else cuerpo = <Historia key={esc.id} contenido={contenido} esc={esc} indice={indice} />

  return (
    <>
      <CabeceraPantalla titulo="NISAR · Ecuador" hallazgo={PREGUNTA} />
      {esc ? null : indice}
      {cuerpo}
      <footer className="historias__creditos">
        Créditos: clima de NASA POWER, límites de provincias de geoBoundaries (CC0), tipografía Public Sans (SIL OFL).
      </footer>
    </>
  )
}

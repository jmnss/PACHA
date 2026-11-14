import type { MensajeError } from '../api/cliente'
import { IconoAlerta, IconoReintentar } from './iconos'
import { useT } from '../idioma/useT'
import { Boton } from './Boton'

/** Cargando: el diseño final con barras grises planas del tamaño real, sin brillo ni desplazamiento. */
export function Cargando({ texto, filas = 3 }: { texto?: string; filas?: number }) {
  const { t } = useT()
  return (
    <div className="estado" role="status" aria-busy="true">
      <div className="estado__barras" aria-hidden="true">
        {Array.from({ length: filas }, (_, i) => (
          <span key={i} className="estado__barra" style={{ width: `${100 - i * 18}%` }} />
        ))}
      </div>
      <p className="estado__texto">{texto ?? t('comun.cargando')}</p>
    </div>
  )
}

/** Texto de un error: si no se tradujo (el español de la API), lleva lang="es". */
export function TextoMensaje({ mensaje }: { mensaje: string | MensajeError }) {
  if (typeof mensaje === 'string') return <>{mensaje}</>
  return mensaje.traducido ? <>{mensaje.texto}</> : <span lang="es">{mensaje.texto}</span>
}

interface PropsError {
  mensaje: string | MensajeError
  /** Hora del último dato bueno, si se conoce. */
  ultimoDato?: string
  onReintentar: () => void
}

/** Error dentro del bloque: una frase y «Reintentar». */
export function ErrorBloque({ mensaje, ultimoDato, onReintentar }: PropsError) {
  const { t } = useT()
  return (
    <div className="estado estado--error" role="alert">
      <p className="estado__texto estado__texto--icono">
        <IconoAlerta />
        <span>
          <TextoMensaje mensaje={mensaje} />
          {ultimoDato ? ` ${t('estructura.estado.ultimo_dato', { hora: ultimoDato })}` : ''}
        </span>
      </p>
      <Boton variante="secundario" icono={<IconoReintentar tamano={14} />} onClick={onReintentar}>
        {t('estructura.estado.reintentar')}
      </Boton>
    </div>
  )
}

/** Vacío: el marco con título y una frase. */
export function Vacio({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="estado estado--vacio">
      <p className="estado__titulo">{titulo}</p>
      <p className="estado__texto">{texto}</p>
    </div>
  )
}

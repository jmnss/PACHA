import { IconoAlerta, IconoReintentar } from './iconos'
import { Boton } from './Boton'

/** Cargando: el diseño final con barras grises planas del tamaño real, sin brillo ni desplazamiento. */
export function Cargando({ texto = 'Cargando…', filas = 3 }: { texto?: string; filas?: number }) {
  return (
    <div className="estado" role="status" aria-busy="true">
      <div className="estado__barras" aria-hidden="true">
        {Array.from({ length: filas }, (_, i) => (
          <span key={i} className="estado__barra" style={{ width: `${100 - i * 18}%` }} />
        ))}
      </div>
      <p className="estado__texto">{texto}</p>
    </div>
  )
}

interface PropsError {
  mensaje: string
  /** Hora del último dato bueno, si se conoce. */
  ultimoDato?: string
  onReintentar: () => void
}

/** Error dentro del bloque: una frase y «Reintentar». */
export function ErrorBloque({ mensaje, ultimoDato, onReintentar }: PropsError) {
  return (
    <div className="estado estado--error" role="alert">
      <p className="estado__texto estado__texto--icono">
        <IconoAlerta />
        <span>
          {mensaje}
          {ultimoDato ? ` Último dato bueno: ${ultimoDato}.` : ''}
        </span>
      </p>
      <Boton variante="secundario" icono={<IconoReintentar tamano={14} />} onClick={onReintentar}>
        Reintentar
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
